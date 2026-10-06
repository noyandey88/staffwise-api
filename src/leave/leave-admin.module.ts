import { Module } from '@nestjs/common';
import { LeaveModule } from './leave.module.js';
import { LeaveAdminController } from './leave-admin.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [LeaveModule],
  controllers: [LeaveAdminController],
})
export class LeaveAdminModule {}
