import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthResponseDto, RegisterDto } from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SyncService } from '../sync/sync.service';
import axios from 'axios';
import { Prisma } from '@prisma/client';
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'crypto';
import { promisify } from 'util';
import * as nodemailer from 'nodemailer';

const scrypt = promisify(scryptCallback);

interface GitHubAccessTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserProfile {
  id: number;
  login: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string;
  bio?: string | null;
  location?: string | null;
  company?: string | null;
  blog?: string | null;
  html_url?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly syncService: SyncService,
  ) {}

  async register(data: RegisterDto): Promise<AuthResponseDto> {
    const email = data.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { authEmail: email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const usernameBase =
      email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 24) || 'developer';
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          authEmail: email,
          name: data.name.trim(),
          username: `${usernameBase}-${randomBytes(3).toString('hex')}`,
          passwordHash: await this.hashPassword(data.password),
          interests: data.interests ?? [],
        },
      });
      return this.createAuthResponse(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }
      throw error;
    }
  }

  async authenticateWithPassword(
    rawEmail: string,
    password: string,
  ): Promise<AuthResponseDto> {
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { authEmail: email },
    });
    if (
      !user?.passwordHash ||
      !(await this.verifyPassword(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.createAuthResponse(user);
  }

  async requestPasswordReset(rawEmail: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { authEmail: email },
    });
    if (!user?.authEmail) {
      return;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });
      await transaction.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });
    });

    try {
      await this.sendPasswordResetEmail(user.authEmail, token);
    } catch (error) {
      await this.prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      this.logger.error(
        'Failed to send password-reset email',
        error instanceof Error ? error.message : String(error),
      );
      throw new ServiceUnavailableException(
        'Password reset is temporarily unavailable. Please try again later.',
      );
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const tokenHash = this.hashResetToken(token);
    const now = new Date();
    const passwordHash = await this.hashPassword(password);

    await this.prisma.$transaction(async (transaction) => {
      const reset = await transaction.passwordResetToken.findUnique({
        where: { tokenHash },
      });
      if (!reset || reset.usedAt || reset.expiresAt <= now) {
        throw new BadRequestException(
          'This password-reset link is invalid or expired.',
        );
      }

      const claimed = await transaction.passwordResetToken.updateMany({
        where: {
          id: reset.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException(
          'This password-reset link is invalid or expired.',
        );
      }

      await transaction.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      });
      await transaction.passwordResetToken.updateMany({
        where: { userId: reset.userId, id: { not: reset.id }, usedAt: null },
        data: { usedAt: now },
      });
    });
  }

  private createAuthResponse(user: {
    id: string;
    githubId: string | null;
    username: string;
    name: string | null;
    email: string | null;
  }): AuthResponseDto {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      githubId: user.githubId,
      username: user.username,
      email: user.email,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
      },
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const key = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${key.toString('hex')}`;
  }

  private async verifyPassword(
    password: string,
    storedHash: string,
  ): Promise<boolean> {
    const [salt, keyHex] = storedHash.split(':');
    if (!salt || !keyHex) {
      return false;
    }
    const expected = Buffer.from(keyHex, 'hex');
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async sendPasswordResetEmail(
    email: string,
    token: string,
  ): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');
    const from = this.configService.get<string>('MAIL_FROM');
    if (!host || !from) {
      throw new Error('SMTP_HOST and MAIL_FROM must be configured.');
    }

    const port = Number(this.configService.get<string>('SMTP_PORT') || '1025');
    const user = this.configService.get<string>('SMTP_USER');
    const password = this.configService.get<string>('SMTP_PASSWORD');
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';
    const appUrl = (
      this.configService.get<string>('APP_URL') || 'http://localhost:3000'
    ).replace(/\/$/, '');
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && password ? { auth: { user, pass: password } } : {}),
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Reset your DevBattle password',
      text: `Use this link within 30 minutes to reset your password: ${resetUrl}`,
      html: `<p>We received a request to reset your DevBattle password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 30 minutes and can only be used once. If you did not request this, you can ignore this email.</p>`,
    });
  }

  async authenticateWithGitHub(code: string): Promise<AuthResponseDto> {
    try {
      if (!code) {
        throw new UnauthorizedException('Invalid GitHub code');
      }

      const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
      const clientSecret = this.configService.get<string>(
        'GITHUB_CLIENT_SECRET',
      );
      if (!clientId || !clientSecret) {
        throw new ServiceUnavailableException(
          'GitHub sign-in is not configured.',
        );
      }

      // 1. Exchange 'code' for an access token
      const tokenResponse = await axios.post<GitHubAccessTokenResponse>(
        'https://github.com/login/oauth/access_token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      const accessToken = tokenResponse.data.access_token;
      if (!accessToken) {
        this.logger.error('Failed to get access token from GitHub');
        throw new UnauthorizedException(
          'Failed to get access token from GitHub',
        );
      }

      // 2. Fetch the user's GitHub profile
      const userResponse = await axios.get<GitHubUserProfile>(
        'https://api.github.com/user',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const githubUser = userResponse.data;
      if (!githubUser.id || !githubUser.login) {
        throw new UnauthorizedException('Failed to fetch GitHub user profile');
      }

      // 3. Find or create the user in the database
      const githubIdString = String(githubUser.id);

      const user = await this.prisma.user.upsert({
        where: { githubId: githubIdString },
        update: {
          name: githubUser.name || null,
          email: githubUser.email || null,
          avatar: githubUser.avatar_url || null,
          bio: githubUser.bio || null,
          location: githubUser.location || null,
          company: githubUser.company || null,
          website: githubUser.blog || null,
          githubUrl: githubUser.html_url || null,
          isOnline: true,
        },
        create: {
          githubId: githubIdString,
          username: githubUser.login,
          name: githubUser.name || null,
          email: githubUser.email || null,
          avatar: githubUser.avatar_url || null,
          bio: githubUser.bio || null,
          location: githubUser.location || null,
          company: githubUser.company || null,
          website: githubUser.blog || null,
          githubUrl: githubUser.html_url || null,
          isOnline: true,
        },
      });

      // 4. Trigger background sync without awaiting
      this.syncService
        .syncUserData(user.id, user.username, accessToken)
        .catch((error: unknown) =>
          this.logger.error(
            `Background sync failed for ${user.username}`,
            error instanceof Error ? error.message : String(error),
          ),
        );

      // 5. Return JWT
      const payload = {
        sub: user.id,
        githubId: user.githubId,
        username: user.username,
      };
      const jwtToken = this.jwtService.sign(payload);

      return {
        accessToken: jwtToken,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
        },
      };
    } catch (error: unknown) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(
        'Failed to authenticate with GitHub',
        error instanceof Error ? error.message : String(error),
      );
      throw new UnauthorizedException('Failed to authenticate with GitHub');
    }
  }
}
