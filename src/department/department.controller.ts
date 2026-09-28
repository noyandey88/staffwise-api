import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import { DepartmentService } from './department.service.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../user/user.types.js';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { DepartmentResponseDto } from './dto/dto/department-response.dto.js';

@Auth()
@ApiTags('Departments')
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post('/create')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Create a new department',
    description: 'Creates a new department using the provided details.',
  })
  @ApiEnvelope(DepartmentResponseDto, {
    message: 'Department created successfully',
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentService.create(createDepartmentDto);
  }

  @Get('/get/all')
  @ApiOperation({
    summary: 'Retrieve all departments',
    description: 'Fetches a list of all departments.',
  })
  @ApiEnvelope(DepartmentResponseDto, {
    message: 'Departments retrieved successfully',
    isArray: true,
  })
  findAll() {
    return this.departmentService.findAll();
  }

  @Get('/get/:id')
  @ApiOperation({
    summary: 'Retrieve a department by ID',
    description: 'Fetches a department by its ID.',
  })
  @ApiEnvelope(DepartmentResponseDto, {
    message: 'Department retrieved successfully',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.departmentService.findById(id);
  }

  @Patch('/update')
  @ApiOperation({
    summary: 'Update a department',
    description: 'Updates a department using the provided details.',
  })
  @ApiEnvelope(DepartmentResponseDto, {
    message: 'Department updated successfully',
  })
  @Roles(UserRole.Admin, UserRole.Hr)
  update(@Body() updateDepartmentDto: UpdateDepartmentDto) {
    return this.departmentService.update(updateDepartmentDto);
  }

  @Delete('/delete/:id')
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: 'Delete a department',
    description: 'Deletes a department by its ID.',
  })
  @ApiEnvelope(null, { message: 'Department deleted successfully' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.departmentService.remove(id);
  }
}
