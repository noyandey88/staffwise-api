import { Module } from '@nestjs/common';
import { NoticeController } from './notice.controller.js';
import { NoticeService } from './notice.service.js';
import { NoticeRepository } from './notice.repository.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { DepartmentModule } from '../department/department.module.js';
import { NoticeAdminController } from './notice-admin.controller.js';

@Module({
  imports: [EmployeesModule, DepartmentModule],
  controllers: [NoticeController, NoticeAdminController],
  providers: [NoticeService, NoticeRepository],
})
export class NoticeModule {}
