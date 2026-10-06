import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { UserRole } from '../user/user.types.js';
import { SalaryStructureService } from './salary-structure.service.js';
import {
  CreateSalaryStructureDto,
  SalaryStructureResponseDto,
} from './dto/salary-structure.dto.js';

@Auth()
@ApiTags('Admin · Payroll')
@Controller('payroll')
export class SalaryStructureAdminController {
  constructor(
    private readonly salaryStructureService: SalaryStructureService,
  ) {}

  @Get('employees/:employeeId/salary')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: "An employee's salary history (newest first)" })
  @ApiEnvelope(SalaryStructureResponseDto, {
    message: 'Salary history retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  findForEmployee(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.salaryStructureService.findForEmployee(employeeId);
  }

  @Post('employees/:employeeId/salary')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Set a salary for an employee from a given date',
    description: 'Adds a history row; earlier salaries are kept.',
  })
  @ApiEnvelope(SalaryStructureResponseDto, {
    message: 'Salary set successfully',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  create(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() dto: CreateSalaryStructureDto,
  ) {
    return this.salaryStructureService.create(employeeId, dto);
  }
}
