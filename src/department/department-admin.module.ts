import { Module } from '@nestjs/common';
import { DepartmentModule } from './department.module.js';
import { DepartmentAdminController } from './department-admin.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [DepartmentModule],
  controllers: [DepartmentAdminController],
})
export class DepartmentAdminModule {}
