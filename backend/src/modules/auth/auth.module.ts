import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SyncModule } from '../sync/sync.module';
import { TokenBlacklistService } from './token-blacklist.service';
import { AttestationValidatorService } from './attestation-validator.service';
import { PasskeyService } from './passkey.service';
import { PasskeyController } from './passkey.controller';
import { SamlSsoService } from './saml-sso.service';
import { Fido2AttestationService } from './fido2-attestation.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error(
            'FATAL: JWT_SECRET environment variable is required to start the application.',
          );
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get('JWT_EXPIRES_IN', '15m'),
          },
        };
      },
    }),
    SyncModule,
  ],
  controllers: [AuthController, PasskeyController],
  providers: [
    AuthService,
    JwtStrategy,
    TokenBlacklistService,
    AttestationValidatorService,
    PasskeyService,
    SamlSsoService,
    Fido2AttestationService,
  ],
  exports: [
    AuthService,
    JwtModule,
    TokenBlacklistService,
    AttestationValidatorService,
    PasskeyService,
    SamlSsoService,
  ],
})
export class AuthModule {}
