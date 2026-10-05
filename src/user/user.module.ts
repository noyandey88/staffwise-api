import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserRepository } from './user.repository.js';
import { UserController } from './user.controller.js';
import { SuperAdminSeeder } from './super-admin.seeder.js';
import { UserAdminController } from './user-admin.controller.js';

@Module({
  providers: [UserService, UserRepository, SuperAdminSeeder],
  exports: [UserService, UserRepository],
  controllers: [UserController, UserAdminController],
})
export class UserModule {}
