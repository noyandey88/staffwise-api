import { Injectable, StreamableFile } from '@nestjs/common';
import { ReportRepository } from './report.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { CalendarService } from '../calendar/calendar.service.js';
import {
  currentMonth,
  monthRange,
  today,
} from '../attendance/attendance.util.js';
import { toCsv } from '../common/utils/csv.util.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { SIGN_IN_BLOCKED_STATUSES } from '../employees/employees.enum.js';

@Injectable()
export class ReportService {
  constructor(
    private readonly repository: ReportRepository,
    private readonly employeesService: EmployeesService,
    private readonly calendarService: CalendarService,
  ) {}

  /** Company-wide snapshot for Admin/HR. */
  async overview() {
    const { start, end } = monthRange(currentMonth());
    const weekendDays = await this.calendarService.weekendDays();
    const [
      departments,
      thisMonth,
      todayCounts,
      pending,
      latestPayrollRun,
      birthdays,
    ] = await Promise.all([
      this.repository.headcountByDepartment(),
      this.repository.movements(start, end),
      this.repository.today(today(), weekendDays),
      this.repository.pending(),
      this.repository.latestPayrollRun(),
      this.employeesService.upcomingBirthdays(7),
    ]);
    return {
      headcount: departments.reduce((sum, d) => sum + d.headcount, 0),
      departments,
      thisMonth,
      today: todayCounts,
      pending,
      latestPayrollRun,
      upcomingBirthdays: birthdays.map((b) => ({
        employeeId: b.employeeId,
        firstName: b.firstName,
        lastName: b.lastName,
        birthday: b.birthday,
        daysUntil: b.daysUntil,
      })),
    };
  }

  /** The caller's (recursive) reports: today's status and open requests. */
  async team(requester: JwtPayload) {
    const me = await this.employeesService.findByUserId(requester.sub);
    const reports = await this.employeesService.reportsOf(me.id, true);
    const ids = reports
      .filter((r) => !SIGN_IN_BLOCKED_STATUSES.includes(r.status))
      .map((r) => r.id);
    const [todayCounts, pending] = await Promise.all([
      this.repository.today(
        today(),
        await this.calendarService.weekendDays(),
        ids,
      ),
      this.repository.pending(ids),
    ]);
    return { teamSize: ids.length, today: todayCounts, pending };
  }

  async headcount(format?: 'json' | 'csv') {
    const rows = await this.repository.headcountByDepartment();
    return format === 'csv'
      ? this.csv('headcount', rows, [
          ['Department', 'departmentName'],
          ['Headcount', 'headcount'],
          ['Permanent', 'permanent'],
          ['Contract', 'contract'],
          ['Intern', 'intern'],
          ['Part-time', 'partTime'],
        ])
      : rows;
  }

  async attendance(month = currentMonth(), format?: 'json' | 'csv') {
    const { start, end } = monthRange(month);
    const rows = await this.repository.attendance(
      start,
      end,
      today(),
      await this.calendarService.weekendDays(),
    );
    return format === 'csv'
      ? this.csv(`attendance-${month}`, rows, [
          ['Employee ID', 'employeeCode'],
          ['Name', 'name'],
          ['Department', 'departmentName'],
          ['Present', 'present'],
          ['Late', 'late'],
          ['Absent', 'absent'],
          ['Leave', 'leave'],
          ['Holidays', 'holidays'],
          ['Worked minutes', 'workedMinutes'],
        ])
      : rows;
  }

  async leave(year = this.currentYear(), format?: 'json' | 'csv') {
    const rows = await this.repository.leave(year);
    return format === 'csv'
      ? this.csv(`leave-${year}`, rows, [
          ['Employee ID', 'employeeCode'],
          ['Name', 'name'],
          ['Department', 'departmentName'],
          ['Leave type', 'leaveType'],
          ['Paid', 'isPaid'],
          ['Days taken', 'daysTaken'],
          ['Remaining', 'remainingDays'],
        ])
      : rows;
  }

  async payroll(year = this.currentYear(), format?: 'json' | 'csv') {
    const rows = await this.repository.payroll(year);
    return format === 'csv'
      ? this.csv(`payroll-${year}`, rows, [
          ['Month', 'month'],
          ['Status', 'status'],
          ['Employees', 'employees'],
          ['Gross', 'totalGross'],
          ['Deductions', 'totalDeductions'],
          ['Net', 'totalNet'],
        ])
      : rows;
  }

  private csv<T extends Record<string, unknown>>(
    name: string,
    rows: T[],
    columns: [header: string, key: keyof T & string][],
  ) {
    const body = toCsv([
      columns.map(([header]) => header),
      ...rows.map((row) =>
        columns.map(([, key]) => {
          const value = row[key];
          return value === null || value === undefined
            ? null
            : typeof value === 'boolean'
              ? value
                ? 'yes'
                : 'no'
              : (value as string | number);
        }),
      ),
    ]);
    return new StreamableFile(Buffer.from(body, 'utf8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${name}.csv"`,
    });
  }

  private currentYear() {
    return Number(today().slice(0, 4));
  }
}
