import { Module } from '@nestjs/common';
import { UserModule } from './user.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UserAdminController } from './user-admin.controller.js';
import { AuthAdminController } from '../auth/auth-admin.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [UserModule, AuthModule],
  controllers: [UserAdminController, AuthAdminController],
})
export class UsersAdminModule {}
