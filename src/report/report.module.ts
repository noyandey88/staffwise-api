import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module.js';
import { ReportService } from './report.service.js';
import { ReportRepository } from './report.repository.js';

/** Report queries; routes live in ReportAdminModule (/admin/dashboard, /admin/reports). */
@Module({
  imports: [EmployeesModule],
  providers: [ReportService, ReportRepository],
  exports: [ReportService],
})
export class ReportModule {}
