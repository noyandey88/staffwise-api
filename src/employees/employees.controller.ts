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
  Query,
} from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { EmployeeResponseDto } from './dto/employee-response.dto.js';
import { UpcomingBirthdaysQueryDto } from './dto/upcoming-birthdays-query.dto.js';
import { UpcomingBirthdayResponseDto } from './dto/upcoming-birthday-response.dto.js';
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
    summary: 'Create a new employee',
    description: 'Creates a new employee using the provided details.',
  })
  @ApiEnvelope(EmployeeResponseDto, {
    message: 'Employee created successfully',
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async create(@Body() data: CreateEmployeeDto) {
    return await this.employeesService.create(data);
  }

  @Get('/get/all')
  @ApiOperation({
    summary: 'Retrieve all employees',
    description: 'Fetches a list of all available employees.',
  })
  @ApiEnvelope(EmployeeResponseDto, {
    message: 'Employees retrieved successfully',
    isArray: true,
  })
  async findAll() {
    return await this.employeesService.findAll();
  }

  @Get('/birthdays/upcoming')
  @ApiOperation({
    summary: 'Upcoming birthdays',
    description:
      'Current employees whose birthday falls within the next `days` days ' +
      '(today included), soonest first. Employees without a date of birth ' +
      'are skipped; the birth year is not exposed.',
  })
  @ApiEnvelope(UpcomingBirthdayResponseDto, {
    message: 'Upcoming birthdays retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async upcomingBirthdays(@Query() query: UpcomingBirthdaysQueryDto) {
    return await this.employeesService.upcomingBirthdays(query.days);
  }

  @Get('/get/:id')
  @ApiOperation({
    summary: 'Retrieve an employee by ID',
    description: 'Fetches an employee by their ID.',
  })
  @ApiEnvelope(EmployeeResponseDto, {
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
  @ApiEnvelope(EmployeeResponseDto, {
    message: 'Employee updated successfully',
  })
  async update(@Body() data: UpdateEmployeeDto) {
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
