import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';
import { EmployeesRepository } from './employees.repository.js';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesRepository],
  exports: [EmployeesService],
})
export class EmployeesModule {}
