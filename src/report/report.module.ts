import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module.js';
import { CalendarModule } from '../calendar/calendar.module.js';
import { ReportController } from './report.controller.js';
import { ReportService } from './report.service.js';
import { ReportRepository } from './report.repository.js';

@Module({
  imports: [EmployeesModule, CalendarModule],
  controllers: [ReportController],
  providers: [ReportService, ReportRepository],
})
export class ReportModule {}
