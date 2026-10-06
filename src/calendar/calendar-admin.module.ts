import { Module } from '@nestjs/common';
import { CalendarModule } from './calendar.module.js';
import { HolidayAdminController } from './holiday-admin.controller.js';
import { WorkWeekAdminController } from './work-week-admin.controller.js';

/** Back-office routes; mounted under /admin by AdminModule's RouterModule config. */
@Module({
  imports: [CalendarModule],
  controllers: [HolidayAdminController, WorkWeekAdminController],
})
export class CalendarAdminModule {}
