import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CalendarRepository } from './calendar.repository.js';
import { CompanyService } from '../company/company.service.js';
import { DEFAULT_WEEKEND_DAYS } from './calendar.constants.js';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/holiday.dto.js';

@Injectable()
export class CalendarService {
  constructor(
    private readonly calendarRepository: CalendarRepository,
    private readonly companyService: CompanyService,
  ) {}

  async weekendDays(): Promise<readonly number[]> {
    const company = await this.companyService.findOptional();
    return company?.weekendDays ?? DEFAULT_WEEKEND_DAYS;
  }

  /** Working days in [start, end] (YYYY-MM-DD, inclusive). */
  async workingDays(start: string, end: string): Promise<number> {
    if (end < start) {
      throw new BadRequestException('endDate must not be before startDate');
    }
    return this.calendarRepository.countWorkingDays(
      start,
      end,
      await this.weekendDays(),
    );
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
    return holiday;
  }

  async updateHoliday(id: number, dto: UpdateHolidayDto) {
    await this.findHoliday(id);
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
    return holiday;
  }

  async removeHoliday(id: number) {
    await this.findHoliday(id);
    await this.calendarRepository.removeHoliday(id);
  }

  private async findHoliday(id: number) {
    const holiday = await this.calendarRepository.findHolidayById(id);
    if (!holiday)
      throw new NotFoundException(`Holiday with id ${id} not found`);
    return holiday;
  }
}
