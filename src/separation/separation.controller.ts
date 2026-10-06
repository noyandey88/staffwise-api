import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { SeparationService } from './separation.service.js';
import {
  ResignDto,
  SeparationResponseDto,
  SettlementResponseDto,
} from './dto/separation.dto.js';

@Auth()
@ApiTags('Separations')
@Controller('separations')
export class SeparationController {
  constructor(private readonly service: SeparationService) {}

  @Post('/resign')
  @ApiOperation({
    summary: 'Submit my resignation',
    description:
      'HR approves it; your status changes after the last working day.',
  })
  @ApiEnvelope(SeparationResponseDto, {
    message: 'Resignation submitted',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  resign(@CurrentUser('sub') userId: number, @Body() dto: ResignDto) {
    return this.service.resign(userId, dto);
  }

  @Get('/me')
  @ApiOperation({ summary: 'My separations' })
  @ApiEnvelope(SeparationResponseDto, {
    message: 'Separations retrieved successfully',
    isArray: true,
  })
  mine(@CurrentUser('sub') userId: number) {
    return this.service.mine(userId);
  }

  @Patch('/:id/cancel')
  @ApiOperation({ summary: 'Withdraw my pending resignation' })
  @ApiEnvelope(SeparationResponseDto, { message: 'Resignation withdrawn' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  cancel(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.cancel(userId, id);
  }

  // --- settlement ---

  @Get('/:id/settlement')
  @ApiOperation({
    summary: 'Final settlement',
    description: 'Admin/HR any time; the employee once it is finalized.',
  })
  @ApiEnvelope(SettlementResponseDto, { message: 'Settlement retrieved' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  settlement(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.settlement(user, id);
  }
}
