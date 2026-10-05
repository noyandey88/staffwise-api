import { Module } from '@nestjs/common';
import { HolidayController } from './holiday.controller.js';
import { CalendarService } from './calendar.service.js';
import { CalendarRepository } from './calendar.repository.js';
import { CalendarAdminController } from './calendar-admin.controller.js';

/** Working-day calendar: weekend days (company profile) + public holidays. */
@Module({
  controllers: [HolidayController, CalendarAdminController],
  providers: [CalendarService, CalendarRepository],
  exports: [CalendarService],
})
export class CalendarModule {}
