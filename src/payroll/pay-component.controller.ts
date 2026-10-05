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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { UserRole } from '../user/user.types.js';
import { PayComponentService } from './pay-component.service.js';
import {
  AssignPayComponentDto,
  CreatePayComponentDto,
  EmployeePayComponentResponseDto,
  PayComponentResponseDto,
  UpdateAssignmentDto,
  UpdatePayComponentDto,
} from './dto/pay-component.dto.js';

@Auth()
@Roles(UserRole.Admin, UserRole.Hr)
@ApiTags('Payroll components')
@Controller('payroll')
export class PayComponentController {
  constructor(private readonly service: PayComponentService) {}

  @Get('/components')
  @ApiOperation({ summary: 'Pay components (earnings and deductions)' })
  @ApiEnvelope(PayComponentResponseDto, {
    message: 'Pay components retrieved successfully',
    isArray: true,
  })
  findAll() {
    return this.service.findAll();
  }

  @Post('/components')
  @ApiOperation({
    summary: 'Create a pay component',
    description:
      'e.g. provident fund (deduction, 10% of basic, applies to all) or ' +
      'income tax (deduction, fixed, set per employee). Affects runs generated afterwards.',
  })
  @ApiEnvelope(PayComponentResponseDto, {
    message: 'Pay component created',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  create(@Body() dto: CreatePayComponentDto) {
    return this.service.create(dto);
  }

  @Patch('/components/:id')
  @ApiOperation({ summary: 'Update a pay component' })
  @ApiEnvelope(PayComponentResponseDto, { message: 'Pay component updated' })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePayComponentDto,
  ) {
    return this.service.update(id, dto);
  }

  @Get('/employees/:employeeId/components')
  @ApiOperation({ summary: "An employee's component assignments" })
  @ApiEnvelope(EmployeePayComponentResponseDto, {
    message: 'Assignments retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  assignments(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.service.assignments(employeeId);
  }

  @Post('/employees/:employeeId/components')
  @ApiOperation({
    summary: 'Assign a component to an employee',
    description:
      'Optional value override and effective period (e.g. a loan instalment Jan–Jun). ' +
      'Overrides an applies-to-all default; a value of 0 exempts the employee.',
  })
  @ApiEnvelope(EmployeePayComponentResponseDto, {
    message: 'Component assigned',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  assign(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() dto: AssignPayComponentDto,
  ) {
    return this.service.assign(employeeId, dto);
  }

  @Patch('/employee-components/:id')
  @ApiOperation({ summary: 'Update an assignment' })
  @ApiEnvelope(EmployeePayComponentResponseDto, {
    message: 'Assignment updated',
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  updateAssignment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.service.updateAssignment(id, dto);
  }

  @Delete('/employee-components/:id')
  @ApiOperation({ summary: 'Remove an assignment' })
  @ApiEnvelope(null, { message: 'Assignment removed' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  async removeAssignment(@Param('id', ParseIntPipe) id: number) {
    await this.service.removeAssignment(id);
    return null;
  }
}
