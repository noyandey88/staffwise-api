import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../user/user.types.js';

@ApiTags('Employees')
@Auth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post('/create')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Create a new course',
    description: 'Creates a new course using the provided details.',
  })
  @ApiEnvelope(null, { message: 'Employee created successfully' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async create(@Body() data: CreateEmployeeDto) {
    return await this.employeesService.create(data);
  }

  @Get('/get/all')
  @ApiOperation({
    summary: 'Retrieve all courses',
    description: 'Fetches a list of all available courses.',
  })
  @ApiEnvelope(null, {
    message: 'Employees retrieved successfully',
    isArray: true,
  })
  async findAll() {
    return await this.employeesService.findAll();
  }

  @Get('/get/:id')
  @ApiOperation({
    summary: 'Retrieve an employee by ID',
    description: 'Fetches an employee by their ID.',
  })
  @ApiEnvelope(null, {
    message: 'Employee retrieved successfully',
  })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return await this.employeesService.findById(id);
  }

  @Patch('/update')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Update an employee',
    description: 'Updates an employee using the provided details.',
  })
  @ApiEnvelope(null, {
    message: 'Employee updated successfully',
  })
  async update(data: UpdateEmployeeDto) {
    return await this.employeesService.update(data);
  }

  @Delete('/delete/:id')
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: 'Delete an employee',
    description: 'Deletes an employee by their ID.',
  })
  @ApiEnvelope(null, {
    message: 'Employee deleted successfully',
  })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return await this.employeesService.delete(id);
  }
}
