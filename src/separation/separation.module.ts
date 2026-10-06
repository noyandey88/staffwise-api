import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module.js';
import { CompanyModule } from '../company/company.module.js';
import { CalendarModule } from '../calendar/calendar.module.js';
import { PayrollPolicyModule } from '../payroll/payroll-policy.module.js';
import { SeparationController } from './separation.controller.js';
import { SeparationService } from './separation.service.js';
import { SeparationRepository } from './separation.repository.js';
import { SeparationScheduler } from './separation.scheduler.js';

@Module({
  imports: [
    EmployeesModule,
    CompanyModule,
    CalendarModule,
    PayrollPolicyModule,
  ],
  controllers: [SeparationController],
  providers: [SeparationService, SeparationRepository, SeparationScheduler],
  exports: [SeparationService],
})
export class SeparationModule {}
