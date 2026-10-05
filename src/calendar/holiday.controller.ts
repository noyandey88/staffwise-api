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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { UserRole } from '../user/user.types.js';
import { CalendarService } from './calendar.service.js';
import { today } from '../attendance/attendance.util.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateWorkWeekDto, WorkWeekResponseDto } from './dto/work-week.dto.js';
import {
  CreateHolidayDto,
  HolidayResponseDto,
  UpdateHolidayDto,
  YearQueryDto,
} from './dto/holiday.dto.js';

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

  @Post('/holidays')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Add a public holiday',
    description:
      'Applies to leave requests created afterwards; existing requests keep their day count.',
  })
  @ApiEnvelope(HolidayResponseDto, {
    message: 'Holiday created successfully',
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(@Body() dto: CreateHolidayDto) {
    return await this.calendarService.createHoliday(dto);
  }

  @Patch('/holidays/:id')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Update a public holiday' })
  @ApiEnvelope(HolidayResponseDto, {
    message: 'Holiday updated successfully',
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHolidayDto,
  ) {
    return await this.calendarService.updateHoliday(id, dto);
  }

  @Delete('/holidays/:id')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({ summary: 'Delete a public holiday' })
  @ApiEnvelope(null, { message: 'Holiday deleted successfully' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.calendarService.removeHoliday(id);
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

  @Post('/work-weeks')
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

  @Delete('/work-weeks/:id')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Cancel a scheduled (future) work week' })
  @ApiEnvelope(null, { message: 'Work week removed' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  async removeWorkWeek(@Param('id', ParseIntPipe) id: number) {
    await this.calendarService.removeWorkWeek(id);
    return null;
  }
}
