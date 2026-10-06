import { Module } from '@nestjs/common';
import { EmployeesModule } from './employees.module.js';
import { EmployeesAdminController } from './employees-admin.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [EmployeesModule],
  controllers: [EmployeesAdminController],
})
export class EmployeesAdminModule {}
