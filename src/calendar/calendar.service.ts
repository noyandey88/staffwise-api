import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CalendarRepository } from './calendar.repository.js';
import { DEFAULT_WEEKEND_DAYS } from './calendar.constants.js';
import { CreateWorkWeekDto } from './dto/work-week.dto.js';
import { today } from '../attendance/attendance.util.js';
import type { WorkWeek } from '../database/schema/work-week.schema.js';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/holiday.dto.js';
import { AuditService } from '../audit/audit.service.js';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

@Injectable()
export class CalendarService {
  constructor(
    private readonly calendarRepository: CalendarRepository,
    private readonly audit: AuditService,
  ) {}

  /** Working days in [start, end] (YYYY-MM-DD, inclusive). */
  async workingDays(start: string, end: string): Promise<number> {
    if (end < start) {
      throw new BadRequestException('endDate must not be before startDate');
    }
    return this.calendarRepository.countWorkingDays(start, end);
  }

  // --- work week ---

  /** History newest first; `current` marks the one in force today. */
  async workWeeks() {
    const rows = await this.calendarRepository.findWorkWeeks();
    const now = today();
    const current = rows.find((r) => r.effectiveFrom <= now);
    return rows.map((r) => this.toWorkWeek(r, r.id === current?.id));
  }

  /** The weekend in force on a date (default when none is set up). */
  async weekendOn(date: string): Promise<readonly number[]> {
    const rows = await this.calendarRepository.findWorkWeeks();
    return (
      rows.find((r) => r.effectiveFrom <= date)?.weekendDays ??
      DEFAULT_WEEKEND_DAYS
    );
  }

  /**
   * A work week from `effectiveFrom` on. A past date re-classifies days
   * from then (attendance, reports, payroll runs generated afterwards);
   * leave requests keep the day count they were created with.
   */
  async createWorkWeek(userId: number, dto: CreateWorkWeekDto) {
    const weekendDays = [...new Set<number>(dto.weekendDays)].sort();
    const row = await this.calendarRepository.createWorkWeek({
      effectiveFrom: dto.effectiveFrom,
      weekendDays,
      createdBy: userId,
    });
    if (!row) {
      throw new ConflictException(
        `A work week starting ${dto.effectiveFrom} already exists`,
      );
    }
    await this.audit.record({
      action: 'work_week.created',
      entityType: 'work_week',
      entityId: row.id,
      after: row,
    });
    return this.toWorkWeek(row, false);
  }

  /** Only scheduled (future) changes can be removed; history stays. */
  async removeWorkWeek(id: number) {
    const row = await this.calendarRepository.findWorkWeekById(id);
    if (!row) throw new NotFoundException(`Work week with id ${id} not found`);
    if (row.effectiveFrom <= today()) {
      throw new ConflictException(
        'Only work weeks that have not started yet can be removed; add a new one instead',
      );
    }
    await this.calendarRepository.removeWorkWeek(id);
    await this.audit.record({
      action: 'work_week.deleted',
      entityType: 'work_week',
      entityId: id,
      before: row,
    });
  }

  private toWorkWeek(row: WorkWeek, current: boolean) {
    return {
      id: row.id,
      effectiveFrom: row.effectiveFrom,
      weekendDays: row.weekendDays,
      weekendDayNames: row.weekendDays.map((d) => DAY_NAMES[d]),
      current,
    };
  }

  async holidaysForYear(year: number) {
    return this.calendarRepository.findHolidays(
      `${year}-01-01`,
      `${year + 1}-01-01`,
    );
  }

  async createHoliday(dto: CreateHolidayDto) {
    const holiday = await this.calendarRepository.createHoliday(dto);
    if (!holiday) {
      throw new ConflictException(`A holiday on ${dto.date} already exists`);
    }
    await this.audit.record({
      action: 'holiday.created',
      entityType: 'holiday',
      entityId: holiday.id,
      after: holiday,
    });
    return holiday;
  }

  async updateHoliday(id: number, dto: UpdateHolidayDto) {
    const before = await this.findHoliday(id);
    if (dto.date === undefined && dto.name === undefined) {
      return this.findHoliday(id);
    }
    const holiday = await this.calendarRepository.updateHoliday(id, {
      date: dto.date,
      name: dto.name,
    });
    if (holiday === null) {
      throw new ConflictException(`A holiday on ${dto.date} already exists`);
    }
    await this.audit.record({
      action: 'holiday.updated',
      entityType: 'holiday',
      entityId: id,
      before,
      after: holiday,
    });
    return holiday;
  }

  async removeHoliday(id: number) {
    const before = await this.findHoliday(id);
    await this.calendarRepository.removeHoliday(id);
    await this.audit.record({
      action: 'holiday.deleted',
      entityType: 'holiday',
      entityId: id,
      before,
    });
  }

  private async findHoliday(id: number) {
    const holiday = await this.calendarRepository.findHolidayById(id);
    if (!holiday)
      throw new NotFoundException(`Holiday with id ${id} not found`);
    return holiday;
  }
}
