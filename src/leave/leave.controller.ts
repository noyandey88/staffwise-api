import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  Patch,
  Param,
  ParseIntPipe,
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
import { Auth } from '../common/decorators/auth.decorator.js';
import { YearQueryDto } from '../calendar/dto/holiday.dto.js';
import { LeaveTypeResponseDto } from './dto/leave-type.dto.js';

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

  // --- balances ---

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
}
