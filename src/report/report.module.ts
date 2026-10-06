import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module.js';
import { ReportController } from './report.controller.js';
import { ReportService } from './report.service.js';
import { ReportRepository } from './report.repository.js';

@Module({
  imports: [EmployeesModule],
  controllers: [ReportController],
  providers: [ReportService, ReportRepository],
  exports: [ReportService],
})
export class ReportModule {}
