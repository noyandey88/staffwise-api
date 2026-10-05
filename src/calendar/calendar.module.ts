import { Module } from '@nestjs/common';
import { HolidayController } from './holiday.controller.js';
import { CalendarService } from './calendar.service.js';
import { CalendarRepository } from './calendar.repository.js';

/** Working-day calendar: weekend days (company profile) + public holidays. */
@Module({
  controllers: [HolidayController],
  providers: [CalendarService, CalendarRepository],
  exports: [CalendarService],
})
export class CalendarModule {}
