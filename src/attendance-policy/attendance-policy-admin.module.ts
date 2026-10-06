import { Module } from '@nestjs/common';
import { AttendancePolicyAdminController } from './attendance-policy-admin.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [],
  controllers: [AttendancePolicyAdminController],
})
export class AttendancePolicyAdminModule {}
