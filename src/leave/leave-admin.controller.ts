import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  Patch,
  Param,
  ParseIntPipe,
  Put,
  Query,
} from '@nestjs/common';
import { LeaveService } from './leave.service.js';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { LeaveBalanceResponseDto } from './dto/leave-balance-response.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../user/user.types.js';
import { Auth } from '../common/decorators/auth.decorator.js';
import { YearQueryDto } from '../calendar/dto/holiday.dto.js';
import {
  CreateLeaveTypeDto,
  LeaveTypeResponseDto,
  UpdateLeaveTypeDto,
} from './dto/leave-type.dto.js';
import {
  AllocateBalancesDto,
  AllocateBalancesResponseDto,
  SetBalanceDto,
  SetBalanceResponseDto,
} from './dto/leave-balance.dto.js';

@Auth()
@ApiTags('Admin · Leave')
@Controller('leave')
export class LeaveAdminController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('types')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Create a leave type' })
  @ApiEnvelope(LeaveTypeResponseDto, {
    message: 'Leave type created successfully',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async createType(@Body() dto: CreateLeaveTypeDto) {
    return await this.leaveService.createType(dto);
  }

  @Patch('types/:id')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Update a leave type',
    description:
      'A new defaultDaysPerYear only affects balances allocated afterwards.',
  })
  @ApiEnvelope(LeaveTypeResponseDto, {
    message: 'Leave type updated successfully',
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async updateType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeaveTypeDto,
  ) {
    return await this.leaveService.updateType(id, dto);
  }

  @Post('balances/allocate')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Allocate yearly balances',
    description:
      "Creates each paid leave type's default balance for current staff " +
      '(or the given employees). Existing balances are kept, so re-running ' +
      'after new hires is safe.',
  })
  @ApiEnvelope(AllocateBalancesResponseDto, {
    message: 'Leave balances allocated',
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async allocate(@Body() dto: AllocateBalancesDto) {
    return await this.leaveService.allocate(dto);
  }

  @Put('balances')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: "Set an employee's remaining days",
    description:
      'Manual adjustment or carry-over; creates the balance if missing.',
  })
  @ApiEnvelope(SetBalanceResponseDto, { message: 'Leave balance saved' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async setBalance(@Body() dto: SetBalanceDto) {
    return await this.leaveService.setBalance(dto);
  }

  @Get('balances/employee/:employeeId')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: "An employee's leave balances for a year" })
  @ApiEnvelope(LeaveBalanceResponseDto, {
    message: 'Balances retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  async employeeBalances(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query() query: YearQueryDto,
  ) {
    return await this.leaveService.balancesForEmployee(employeeId, query.year);
  }
}
