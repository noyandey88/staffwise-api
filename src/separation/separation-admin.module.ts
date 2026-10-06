import { Module } from '@nestjs/common';
import { SeparationModule } from './separation.module.js';
import { SeparationAdminController } from './separation-admin.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [SeparationModule],
  controllers: [SeparationAdminController],
})
export class SeparationAdminModule {}
