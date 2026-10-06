import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UserModule } from '../user/user.module.js';
import { RefreshTokenRepository } from './refresh-token.repository.js';
import { PasswordResetRepository } from './password-reset.repository.js';

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<number>('JWT_ACCESS_EXPIRES_IN'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenRepository, PasswordResetRepository],
  exports: [AuthService],
})
export class AuthModule {}
