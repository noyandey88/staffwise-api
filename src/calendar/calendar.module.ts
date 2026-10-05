import { Module } from '@nestjs/common';
import { CompanyModule } from '../company/company.module.js';
import { HolidayController } from './holiday.controller.js';
import { CalendarService } from './calendar.service.js';
import { CalendarRepository } from './calendar.repository.js';

/** Working-day calendar: weekend days (company profile) + public holidays. */
@Module({
  imports: [CompanyModule],
  controllers: [HolidayController],
  providers: [CalendarService, CalendarRepository],
  exports: [CalendarService],
})
export class CalendarModule {}
