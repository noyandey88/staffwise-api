import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { DepartmentService } from './department.service.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { DepartmentResponseDto } from './dto/department-response.dto.js';

@Auth()
@ApiTags('Departments')
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
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

  @Get('/:id')
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
}
