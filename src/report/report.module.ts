import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module.js';
import { ReportController } from './report.controller.js';
import { ReportService } from './report.service.js';
import { ReportRepository } from './report.repository.js';
import { ReportAdminController } from './report-admin.controller.js';

@Module({
  imports: [EmployeesModule],
  controllers: [ReportController, ReportAdminController],
  providers: [ReportService, ReportRepository],
})
export class ReportModule {}
