import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module.js';
import { DepartmentModule } from '../department/department.module.js';
import { CalendarModule } from '../calendar/calendar.module.js';
import { WorkModeController } from './work-mode.controller.js';
import { WorkModeService } from './work-mode.service.js';
import { WorkModeRepository } from './work-mode.repository.js';
import { RemoteWorkService } from './remote-work.service.js';
import { RemoteWorkRepository } from './remote-work.repository.js';

@Module({
  imports: [EmployeesModule, DepartmentModule, CalendarModule],
  controllers: [WorkModeController],
  providers: [
    WorkModeService,
    WorkModeRepository,
    RemoteWorkService,
    RemoteWorkRepository,
  ],
  exports: [WorkModeService, RemoteWorkService],
})
export class WorkModeModule {}
