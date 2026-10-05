import { Module } from '@nestjs/common';
import { DepartmentService } from './department.service.js';
import { DepartmentController } from './department.controller.js';
import { DepartmentRepository } from './department.repository.js';
import { DepartmentAdminController } from './department-admin.controller.js';

@Module({
  controllers: [DepartmentController, DepartmentAdminController],
  providers: [DepartmentService, DepartmentRepository],
  exports: [DepartmentService],
})
export class DepartmentModule {}
