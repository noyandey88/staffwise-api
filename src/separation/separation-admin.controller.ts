import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { UserRole } from '../user/user.types.js';
import { SeparationService } from './separation.service.js';
import {
  ApproveSeparationDto,
  CreateSeparationDto,
  SeparationQueryDto,
  SeparationResponseDto,
  SetAdjustmentsDto,
  SettlementResponseDto,
} from './dto/separation.dto.js';

@Auth()
@ApiTags('Admin · Separations')
@Controller('separations')
export class SeparationAdminController {
  constructor(private readonly service: SeparationService) {}

  @Get()
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'All separations' })
  @ApiEnvelope(SeparationResponseDto, {
    message: 'Separations retrieved successfully',
    paginated: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  list(@Query() query: SeparationQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Record a separation (approved)',
    description:
      'Termination, retirement, or a resignation received outside the app. ' +
      'A past last working day takes effect immediately.',
  })
  @ApiEnvelope(SeparationResponseDto, {
    message: 'Separation recorded',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSeparationDto) {
    return this.service.createApproved(user, dto);
  }

  @Patch(':id/approve')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Approve a resignation',
    description:
      'Optionally sets a different last working day. Creates the draft settlement.',
  })
  @ApiEnvelope(SeparationResponseDto, { message: 'Separation approved' })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  approve(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveSeparationDto,
  ) {
    return this.service.approve(user, id, dto);
  }

  @Patch(':id/reject')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Reject a resignation' })
  @ApiEnvelope(SeparationResponseDto, { message: 'Separation rejected' })
  @ApiErrorResponses(
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  reject(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.reject(user, id);
  }

  @Patch(':id/withdraw')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Withdraw an approved separation before it takes effect',
  })
  @ApiEnvelope(SeparationResponseDto, { message: 'Separation withdrawn' })
  @ApiErrorResponses(
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  withdraw(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.revoke(user, id);
  }

  @Post(':id/settlement/recompute')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Recalculate the draft settlement',
    description:
      'From current salary, leave and payroll data; manual lines are kept.',
  })
  @ApiEnvelope(SettlementResponseDto, { message: 'Settlement recalculated' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  recompute(@Param('id', ParseIntPipe) id: number) {
    return this.service.recompute(id);
  }

  @Put(':id/settlement/adjustments')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Set manual settlement lines',
    description:
      'Bonus, notice-period shortfall, loan recovery…; replaces all manual lines.',
  })
  @ApiEnvelope(SettlementResponseDto, { message: 'Settlement updated' })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  setAdjustments(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetAdjustmentsDto,
  ) {
    return this.service.setAdjustments(id, dto);
  }

  @Patch(':id/settlement/finalize')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Finalize the settlement (locks it)' })
  @ApiEnvelope(SettlementResponseDto, { message: 'Settlement finalized' })
  @ApiErrorResponses(
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  finalize(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.finalize(user, id);
  }

  @Patch(':id/settlement/mark-paid')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Mark a finalized settlement as paid' })
  @ApiEnvelope(SettlementResponseDto, { message: 'Settlement marked as paid' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  markPaid(@Param('id', ParseIntPipe) id: number) {
    return this.service.markPaid(id);
  }
}
