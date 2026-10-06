import { Module } from '@nestjs/common';
import { AttendanceModule } from './attendance.module.js';
import { AttendanceAdminController } from './attendance-admin.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [AttendanceModule],
  controllers: [AttendanceAdminController],
})
export class AttendanceAdminModule {}
