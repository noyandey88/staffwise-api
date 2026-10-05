import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';
import { EmployeesRepository } from './employees.repository.js';
import { EmployeesAdminController } from './employees-admin.controller.js';

@Module({
  controllers: [EmployeesController, EmployeesAdminController],
  providers: [EmployeesService, EmployeesRepository],
  exports: [EmployeesService],
})
export class EmployeesModule {}
