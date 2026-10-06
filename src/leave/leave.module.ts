import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service.js';
import { LeaveController } from './leave.controller.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { LeaveRepository } from './leave.repository.js';
import { CalendarModule } from '../calendar/calendar.module.js';

@Module({
  imports: [EmployeesModule, CalendarModule],
  controllers: [LeaveController],
  providers: [LeaveService, LeaveRepository],
  exports: [LeaveService],
})
export class LeaveModule {}
