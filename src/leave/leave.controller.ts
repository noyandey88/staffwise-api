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
import { LeaveRequestResponseDto } from './dto/leave-request-response.dto.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CreateLeaveRequestDto } from './dto/create-leave.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { LeaveBalanceResponseDto } from './dto/leave-balance-response.dto.js';
import { type JwtPayload } from '../auth/auth.types.js';
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
import { LeaveRequestQueryDto } from './dto/leave-request-query.dto.js';

@Auth()
@ApiTags('Leave')
@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  // --- leave types ---

  @Get('/types')
  @ApiOperation({ summary: 'Leave types' })
  @ApiEnvelope(LeaveTypeResponseDto, {
    message: 'Leave types retrieved successfully',
    isArray: true,
  })
  async findTypes() {
    return await this.leaveService.findTypes();
  }

  @Post('/types')
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

  @Patch('/types/:id')
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

  // --- balances ---

  @Post('/balances/allocate')
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

  @Put('/balances')
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

  @Get('/balances/employee/:employeeId')
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

  // --- requests ---

  @Post('/request')
  @ApiOperation({
    summary: 'Submit a leave request',
    description:
      'days counts working days only (weekends and public holidays are excluded). ' +
      'Paid leave needs enough remaining balance.',
  })
  @ApiEnvelope(LeaveRequestResponseDto, {
    message: 'Leave request submitted',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async create(
    @CurrentUser('sub') userId: number,
    @Body() createLeaveDto: CreateLeaveRequestDto,
  ) {
    return await this.leaveService.create(userId, createLeaveDto);
  }

  @Get('/me')
  @ApiOperation({ summary: 'My leave requests' })
  @ApiEnvelope(LeaveRequestResponseDto, {
    message: 'Leave requests retrieved successfully',
    isArray: true,
  })
  async findMine(@CurrentUser('sub') userId: number) {
    return await this.leaveService.findMine(userId);
  }

  @Get('/balances/me')
  @ApiOperation({ summary: 'My leave balances for a year' })
  @ApiEnvelope(LeaveBalanceResponseDto, {
    message: 'Balances retrieved successfully',
    isArray: true,
  })
  async myBalances(
    @CurrentUser('sub') userId: number,
    @Query() query: YearQueryDto,
  ) {
    return await this.leaveService.myBalances(userId, query.year);
  }

  @Get('/requests')
  @Roles(UserRole.Admin, UserRole.Hr, UserRole.Manager)
  @ApiOperation({
    summary: 'Leave requests, filterable',
    description: 'Admin/HR: everyone. Manager: only their reports.',
  })
  @ApiEnvelope(LeaveRequestResponseDto, {
    message: 'Leave requests retrieved successfully',
    paginated: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN)
  async findRequests(
    @CurrentUser() user: JwtPayload,
    @Query() query: LeaveRequestQueryDto,
  ) {
    return await this.leaveService.findRequests(user, query);
  }

  @Get('/pending')
  @Roles(UserRole.Admin, UserRole.Hr, UserRole.Manager)
  @ApiOperation({
    summary: 'Pending leave requests',
    description: 'Admin/HR: everyone. Manager: only their reports.',
  })
  @ApiEnvelope(LeaveRequestResponseDto, {
    message: 'Pending requests retrieved successfully',
    isArray: true,
  })
  async findPending(@CurrentUser() user: JwtPayload) {
    return await this.leaveService.findPending(user);
  }

  @Patch('/:id/cancel')
  @ApiOperation({ summary: 'Cancel my pending leave request' })
  @ApiEnvelope(LeaveRequestResponseDto, { message: 'Leave request cancelled' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  async cancel(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.leaveService.cancel(userId, id);
  }

  @Patch('/:id/approve')
  @Roles(UserRole.Admin, UserRole.Hr, UserRole.Manager)
  @ApiOperation({
    summary: 'Approve a leave request',
    description: 'Nobody reviews their own; managers only their reports.',
  })
  @ApiEnvelope(LeaveRequestResponseDto, { message: 'Leave request approved' })
  @ApiErrorResponses(
    HttpStatus.CONFLICT,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  async approve(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.leaveService.approve(user, id);
  }

  @Patch('/:id/reject')
  @Roles(UserRole.Admin, UserRole.Hr, UserRole.Manager)
  @ApiOperation({ summary: 'Reject a leave request' })
  @ApiEnvelope(LeaveRequestResponseDto, { message: 'Leave request rejected' })
  @ApiErrorResponses(
    HttpStatus.CONFLICT,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  async reject(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.leaveService.reject(user, id);
  }
}
