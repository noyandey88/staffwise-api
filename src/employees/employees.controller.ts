import { Controller, Get, Patch, Post } from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';

@ApiTags('Employees')
@Auth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post('/create')
  async create(data: CreateEmployeeDto) {
    return await this.employeesService.create(data);
  }

  @Get('/get/all')
  async findAll() {
    return await this.employeesService.findAll();
  }

  @Get('/get/id/:id')
  async findById(id: number) {
    return await this.employeesService.findById(id);
  }

  @Patch('/update/:id')
  async update(data: UpdateEmployeeDto) {
    return await this.employeesService.update(data);
  }
}
