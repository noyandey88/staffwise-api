import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service.js';
import { LeaveController } from './leave.controller.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { LeaveRepository } from './leave.repository.js';

@Module({
  imports: [EmployeesModule],
  controllers: [LeaveController],
  providers: [LeaveService, LeaveRepository],
})
export class LeaveModule {}
