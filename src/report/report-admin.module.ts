import { Module } from '@nestjs/common';
import { ReportModule } from './report.module.js';
import { DashboardAdminController } from './dashboard-admin.controller.js';
import { ReportsAdminController } from './report-admin.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [ReportModule],
  controllers: [DashboardAdminController, ReportsAdminController],
})
export class ReportAdminModule {}
