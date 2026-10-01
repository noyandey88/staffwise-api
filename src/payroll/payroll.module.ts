import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { PayrollController } from './payroll.controller.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { PayrollRepository } from './payroll.repository.js';

@Module({
  imports: [EmployeesModule],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollRepository],
})
export class PayrollModule {}
