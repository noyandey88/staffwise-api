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
import {
  EmployeeResponseDto,
  DepartmentHistoryEntryDto,
} from './dto/employee-response.dto.js';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../user/user.types.js';

@ApiTags('Admin · Employees')
@Auth()
@Controller('admin')
export class EmployeesAdminController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post('employees')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Create a new employee',
    description: 'Creates a new employee using the provided details.',
  })
  @ApiEnvelope(EmployeeResponseDto, {
    message: 'Employee created successfully',
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(@Body() data: CreateEmployeeDto) {
    return await this.employeesService.create(data);
  }

  @Get('employees/:id/department-history')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: "An employee's department history",
    description:
      'Newest first; date-based rules use the department in force on each day.',
  })
  @ApiEnvelope(DepartmentHistoryEntryDto, {
    message: 'Department history retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  async departmentHistory(@Param('id', ParseIntPipe) id: number) {
    return await this.employeesService.departmentHistory(id);
  }

  @Patch('employees/:id')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Update an employee',
    description: 'Updates an employee using the provided details.',
  })
  @ApiEnvelope(EmployeeResponseDto, {
    message: 'Employee updated successfully',
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateEmployeeDto,
  ) {
    return await this.employeesService.update(id, data);
  }

  @Delete('employees/:id')
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
