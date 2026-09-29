import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeesRepository } from './employees.repository.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';

@Injectable()
export class EmployeesService {
  constructor(private readonly employeesRepository: EmployeesRepository) {}

  async create(data: CreateEmployeeDto) {
    const existing = await this.employeesRepository.findByUserId(data.userId);

    if (existing) {
      throw new ConflictException(
        'This user is already linked to an employee record',
      );
    }

    const employee = await this.employeesRepository.create(data);
    return employee;
  }

  async findAll() {
    return await this.employeesRepository.findAll();
  }

  async findById(id: number) {
    const employee = await this.employeesRepository.findById(id);

    if (!employee) {
      throw new NotFoundException(`Employee with id ${id} not found`);
    }

    return employee;
  }

  async findByUserId(userId: number) {
    const employee = await this.employeesRepository.findByUserId(userId);

    if (!employee) {
      throw new NotFoundException(`Employee with userId ${userId} not found`);
    }

    return employee;
  }

  async update(data: UpdateEmployeeDto) {
    // id is an identity column (GENERATED ALWAYS), so it must not be in the SET clause
    const { id, ...changes } = data;
    await this.findById(id);
    return await this.employeesRepository.update(id, changes);
  }

  async delete(id: number) {
    await this.findById(id);
    await this.employeesRepository.remove(id);
  }

  async findReports(id: number) {
    await this.findById(id); // 404 if the manager doesn't exist
    return this.employeesRepository.findReports(id);
  }
}
