import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { DepartmentRepository } from './department.repository.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly audit: AuditService,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    const existing = await this.departmentRepository.findByName(
      createDepartmentDto.name,
    );

    if (existing) {
      throw new ConflictException(
        `Department with name ${createDepartmentDto.name} already exists`,
      );
    }

    const department =
      await this.departmentRepository.create(createDepartmentDto);
    await this.audit.record({
      action: 'department.created',
      entityType: 'department',
      entityId: department.id,
      after: department,
    });
    return department;
  }

  async findAll() {
    return await this.departmentRepository.findAll();
  }

  async findById(id: number) {
    const department = await this.departmentRepository.findById(id);

    if (!department) {
      throw new NotFoundException(`Department with id ${id} not found`);
    }

    return department;
  }

  async update(updateDepartmentDto: UpdateDepartmentDto) {
    const before = await this.findById(updateDepartmentDto.id);

    const { id, ...rest } = updateDepartmentDto;
    const department = await this.departmentRepository.update(id, rest);
    await this.audit.record({
      action: 'department.updated',
      entityType: 'department',
      entityId: id,
      before,
      after: department,
    });
    return department;
  }

  async remove(id: number) {
    const before = await this.findById(id);
    await this.departmentRepository.remove(id);
    await this.audit.record({
      action: 'department.deleted',
      entityType: 'department',
      entityId: id,
      before,
    });
  }
}
