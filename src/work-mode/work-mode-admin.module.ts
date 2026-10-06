import { Module } from '@nestjs/common';
import { WorkModeModule } from './work-mode.module.js';
import { WorkModeAdminController } from './work-mode-admin.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [WorkModeModule],
  controllers: [WorkModeAdminController],
})
export class WorkModeAdminModule {}
