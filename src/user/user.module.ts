import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserRepository } from './user.repository.js';
import { UserController } from './user.controller.js';
import { SuperAdminSeeder } from './super-admin.seeder.js';

@Module({
  providers: [UserService, UserRepository, SuperAdminSeeder],
  exports: [UserService, UserRepository],
  controllers: [UserController],
})
export class UserModule {}
