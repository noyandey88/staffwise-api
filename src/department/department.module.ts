import { Module } from '@nestjs/common';
import { DepartmentService } from './department.service.js';
import { DepartmentController } from './department.controller.js';
import { DepartmentRepository } from './department.repository.js';

@Module({
  controllers: [DepartmentController],
  providers: [DepartmentService, DepartmentRepository],
})
export class DepartmentModule {}
