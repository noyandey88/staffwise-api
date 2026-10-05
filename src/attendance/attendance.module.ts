import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { AttendanceController } from './attendance.controller.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { AttendanceRepository } from './attendance.repository.js';
import { WorkModeModule } from '../work-mode/work-mode.module.js';
import { OfficeModule } from '../office/office.module.js';
import { AttendanceAdminController } from './attendance-admin.controller.js';

@Module({
  imports: [EmployeesModule, WorkModeModule, OfficeModule],
  controllers: [AttendanceController, AttendanceAdminController],
  providers: [AttendanceService, AttendanceRepository],
})
export class AttendanceModule {}
