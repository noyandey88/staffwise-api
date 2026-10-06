import { Module } from '@nestjs/common';
import { NoticeController } from './notice.controller.js';
import { NoticeService } from './notice.service.js';
import { NoticeRepository } from './notice.repository.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { DepartmentModule } from '../department/department.module.js';

@Module({
  imports: [EmployeesModule, DepartmentModule],
  controllers: [NoticeController],
  providers: [NoticeService, NoticeRepository],
  exports: [NoticeService],
})
export class NoticeModule {}
