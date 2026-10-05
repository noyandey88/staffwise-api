import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service.js';
import { LeaveController } from './leave.controller.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { LeaveRepository } from './leave.repository.js';
import { CalendarModule } from '../calendar/calendar.module.js';
import { LeaveAdminController } from './leave-admin.controller.js';

@Module({
  imports: [EmployeesModule, CalendarModule],
  controllers: [LeaveController, LeaveAdminController],
  providers: [LeaveService, LeaveRepository],
})
export class LeaveModule {}
