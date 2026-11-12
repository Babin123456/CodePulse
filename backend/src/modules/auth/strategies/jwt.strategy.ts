import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub?: unknown;
  githubId?: unknown;
  username?: unknown;
  email?: unknown;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    // This payload is the decoded JWT
    // Passport automatically attaches this return value to req.user
    if (!payload || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: payload.sub,
      githubId: typeof payload.githubId === 'string' ? payload.githubId : null,
      username: typeof payload.username === 'string' ? payload.username : null,
      email: typeof payload.email === 'string' ? payload.email : null,
    };
  }
}
