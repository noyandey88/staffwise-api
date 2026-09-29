import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { AttendanceController } from './attendance.controller.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { AttendanceRepository } from './attendance.repository.js';

@Module({
  imports: [EmployeesModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository],
})
export class AttendanceModule {}
