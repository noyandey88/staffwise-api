import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { DepartmentRepository } from './department.repository.js';

@Injectable()
export class DepartmentService {
  constructor(private readonly departmentRepository: DepartmentRepository) {}
  async create(createDepartmentDto: CreateDepartmentDto) {
    const existing = await this.departmentRepository.findByName(
      createDepartmentDto.name,
    );

    if (existing) {
      throw new ConflictException(
        `Department with name ${createDepartmentDto.name} already exists`,
      );
    }

    return this.departmentRepository.create(createDepartmentDto);
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
    await this.findById(updateDepartmentDto.id);

    const { id, ...rest } = updateDepartmentDto;
    return this.departmentRepository.update(id, rest);
  }

  async remove(id: number) {
    await this.findById(id);
    await this.departmentRepository.remove(id);
  }
}
