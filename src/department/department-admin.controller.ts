import {
  Controller,
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
import { DepartmentResponseDto } from './dto/department-response.dto.js';

@Auth()
@ApiTags('Admin · Departments')
@Controller('departments')
export class DepartmentAdminController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
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

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a department',
    description: 'Updates a department using the provided details.',
  })
  @ApiEnvelope(DepartmentResponseDto, {
    message: 'Department updated successfully',
  })
  @Roles(UserRole.Admin, UserRole.Hr)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentService.update(id, dto);
  }

  @Delete(':id')
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
