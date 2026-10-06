import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { CalendarService } from './calendar.service.js';
import { today } from '../attendance/attendance.util.js';
import { WorkWeekResponseDto } from './dto/work-week.dto.js';
import { HolidayResponseDto, YearQueryDto } from './dto/holiday.dto.js';

@Auth()
@ApiTags('Calendar')
@Controller()
export class HolidayController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('/holidays')
  @ApiOperation({ summary: 'Public holidays for a year' })
  @ApiEnvelope(HolidayResponseDto, {
    message: 'Holidays retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async findForYear(@Query() query: YearQueryDto) {
    return await this.calendarService.holidaysForYear(
      query.year ?? Number(today().slice(0, 4)),
    );
  }

  // --- work week ---

  @Get('/work-weeks')
  @ApiOperation({
    summary: 'Work week history',
    description: 'Newest first; `current` is the one in force today.',
  })
  @ApiEnvelope(WorkWeekResponseDto, {
    message: 'Work weeks retrieved successfully',
    isArray: true,
  })
  async workWeeks() {
    return await this.calendarService.workWeeks();
  }
}
