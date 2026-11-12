import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        rating: true,
        stats: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User @${username} not found`);
    }
    return this.withoutCredentials(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        rating: true,
        stats: true,
        languages: true,
        repositories: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        badges: {
          include: { badge: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return this.withoutCredentials(user);
  }

  async updateProfile(userId: string, data: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.withoutCredentials(user);
  }

  private withoutCredentials<
    T extends { passwordHash: string | null; authEmail: string | null },
  >(user: T): Omit<T, 'passwordHash' | 'authEmail'> {
    const { passwordHash, authEmail, ...safeUser } = user;
    void passwordHash;
    void authEmail;
    return safeUser;
  }
}
