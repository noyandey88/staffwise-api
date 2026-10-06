import {
  Body,
  Controller,
  Delete,
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
import { CalendarService } from './calendar.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateWorkWeekDto, WorkWeekResponseDto } from './dto/work-week.dto.js';

@Auth()
@ApiTags('Admin · Calendar')
@Controller('work-weeks')
export class WorkWeekAdminController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: 'Set the weekend from a date',
    description:
      'Any 0–6 days off (e.g. Friday, Friday–Saturday, Saturday–Sunday). Days before ' +
      'effectiveFrom keep the previous work week.',
  })
  @ApiEnvelope(WorkWeekResponseDto, {
    message: 'Work week saved',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async createWorkWeek(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateWorkWeekDto,
  ) {
    return await this.calendarService.createWorkWeek(userId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Cancel a scheduled (future) work week' })
  @ApiEnvelope(null, { message: 'Work week removed' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  async removeWorkWeek(@Param('id', ParseIntPipe) id: number) {
    await this.calendarService.removeWorkWeek(id);
    return null;
  }
}
