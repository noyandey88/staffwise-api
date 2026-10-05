import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceRepository } from './attendance.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { CalendarService } from '../calendar/calendar.service.js';
import {
  addDays,
  currentMonth,
  localDate,
  monthRange,
  today,
} from './attendance.util.js';
import {
  CORRECTION_WINDOW_DAYS,
  MAX_SHIFT_HOURS,
} from './attendance.constants.js';
import {
  AttendanceCorrectionQueryDto,
  CreateAttendanceCorrectionDto,
} from './dto/attendance-correction.dto.js';
import { pageWindow, paginated } from '../common/utils/pagination.util.js';
import { NotificationService } from '../mail/notification.service.js';
import { UserRole } from '../user/user.types.js';
import { JwtPayload } from '../auth/auth.types.js';
import { EmployeeStatus } from '../employees/employees.enum.js';
import { AuditService } from '../audit/audit.service.js';

/** Roles that see and review every employee's attendance. */
const ATTENDANCE_ADMIN_ROLES: readonly UserRole[] = [
  UserRole.SuperAdmin,
  UserRole.Admin,
  UserRole.Hr,
];

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly employeeService: EmployeesService,
    private readonly calendarService: CalendarService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  async checkIn(userId: number) {
    const employee = await this.findActiveEmployee(userId);
    const record = await this.attendanceRepository.checkIn(
      employee.id,
      today(),
    );

    if (!record) {
      throw new ConflictException('Attendance record already exists for today');
    }

    return record;
  }

  async checkOut(userId: number) {
    const employee = await this.findActiveEmployee(userId);
    const record = await this.attendanceRepository.checkOut(
      employee.id,
      today(),
    );

    if (!record) {
      throw new ConflictException('No attendance record found for today');
    }

    return record;
  }

  async findMine(userId: number, month = currentMonth()) {
    const employee = await this.employeeService.findByUserId(userId);
    const { start, end } = monthRange(month);

    return await this.attendanceRepository.findByEmployeeAndMonth(
      employee.id,
      start,
      end,
    );
  }

  async findForEmployee(
    requester: JwtPayload,
    employeeId: number,
    month = currentMonth(),
  ) {
    await this.assertCanView(requester, employeeId);
    const { start, end } = monthRange(month);
    return await this.attendanceRepository.findByEmployeeAndMonth(
      employeeId,
      start,
      end,
    );
  }

  async summary(month = currentMonth()) {
    const { start, end } = monthRange(month);
    return await this.attendanceRepository.monthlySummary(start, end);
  }

  // --- daily status ---

  async myDays(userId: number, month = currentMonth()) {
    const employee = await this.employeeService.findByUserId(userId);
    return this.dailyStatus(employee.id, month);
  }

  async daysForEmployee(
    requester: JwtPayload,
    employeeId: number,
    month = currentMonth(),
  ) {
    await this.employeeService.findById(employeeId);
    await this.assertCanView(requester, employeeId);
    return this.dailyStatus(employeeId, month);
  }

  private async dailyStatus(employeeId: number, month: string) {
    const { start, end } = monthRange(month);
    return this.attendanceRepository.dailyStatus(
      employeeId,
      start,
      end,
      today(),
      await this.calendarService.weekendDays(),
    );
  }

  // --- corrections ---

  /**
   * Asks to set a day's check-in and/or check-out. The day must be today or
   * within CORRECTION_WINDOW_DAYS before it; a day without a record needs
   * a check-in time.
   */
  async requestCorrection(userId: number, dto: CreateAttendanceCorrectionDto) {
    const employee = await this.employeeService.findByUserId(userId);
    if (dto.checkInAt === undefined && dto.checkOutAt === undefined) {
      throw new BadRequestException('Provide checkInAt, checkOutAt or both');
    }
    const now = today();
    if (dto.workDate > now) {
      throw new BadRequestException('Future days cannot be corrected');
    }
    if (dto.workDate < addDays(now, -CORRECTION_WINDOW_DAYS)) {
      throw new BadRequestException(
        `Only the last ${CORRECTION_WINDOW_DAYS} days can be corrected`,
      );
    }
    if (dto.workDate < employee.hiredAt) {
      throw new BadRequestException('workDate is before the hire date');
    }

    const checkInAt = dto.checkInAt ? new Date(dto.checkInAt) : undefined;
    const checkOutAt = dto.checkOutAt ? new Date(dto.checkOutAt) : undefined;
    if (checkInAt && localDate(checkInAt) !== dto.workDate) {
      throw new BadRequestException('checkInAt must fall on workDate');
    }
    const instant = new Date();
    if (
      (checkInAt && checkInAt > instant) ||
      (checkOutAt && checkOutAt > instant)
    ) {
      throw new BadRequestException('Corrected times cannot be in the future');
    }

    const record = await this.attendanceRepository.findRecord(
      employee.id,
      dto.workDate,
    );
    const mergedIn = checkInAt ?? record?.checkInAt;
    if (!mergedIn) {
      throw new BadRequestException(
        'The day has no attendance record, so checkInAt is required',
      );
    }
    this.assertValidShift(mergedIn, checkOutAt ?? record?.checkOutAt ?? null);

    const correction = await this.attendanceRepository.createCorrection({
      employeeId: employee.id,
      workDate: dto.workDate,
      checkInAt: checkInAt ?? null,
      checkOutAt: checkOutAt ?? null,
      reason: dto.reason,
    });
    if (!correction) {
      throw new ConflictException(
        'A pending correction for this day already exists',
      );
    }
    return correction;
  }

  async myCorrections(userId: number) {
    const employee = await this.employeeService.findByUserId(userId);
    const { items } = await this.attendanceRepository.findCorrections({
      employeeIds: [employee.id],
    });
    return items;
  }

  /** Admin/HR: everyone. Manager: their (recursive) reports. */
  async findCorrections(
    requester: JwtPayload,
    query: AttendanceCorrectionQueryDto,
  ) {
    let employeeIds: number[] | undefined;
    if (!ATTENDANCE_ADMIN_ROLES.includes(requester.role)) {
      employeeIds = await this.reportIds(requester.sub);
      if (
        query.employeeId !== undefined &&
        !employeeIds.includes(query.employeeId)
      ) {
        throw new ForbiddenException(
          "You cannot view this employee's attendance",
        );
      }
    }
    if (query.employeeId !== undefined) employeeIds = [query.employeeId];
    const window = pageWindow(query);
    const { items, total } = await this.attendanceRepository.findCorrections(
      { employeeIds, status: query.status },
      window,
    );
    return paginated(items, total, window);
  }

  async cancelCorrection(userId: number, id: number) {
    const employee = await this.employeeService.findByUserId(userId);
    const cancelled = await this.attendanceRepository.cancelCorrection(
      id,
      employee.id,
    );
    if (cancelled) return cancelled;

    const correction = await this.attendanceRepository.findCorrectionById(id);
    if (!correction || correction.employeeId !== employee.id) {
      throw new NotFoundException('Attendance correction not found');
    }
    throw new ConflictException('Only pending corrections can be cancelled');
  }

  async approveCorrection(requester: JwtPayload, id: number) {
    await this.assertCanReviewCorrection(requester, id);
    const approved = await this.attendanceRepository.approveCorrection(
      id,
      requester.sub,
      (checkInAt, checkOutAt) => this.assertValidShift(checkInAt, checkOutAt),
    );
    await this.audit.record({
      action: 'attendance_correction.approved',
      entityType: 'attendance_correction',
      entityId: id,
      metadata: {
        employeeId: approved.employeeId,
        workDate: approved.workDate,
        checkInAt: approved.checkInAt,
        checkOutAt: approved.checkOutAt,
      },
    });
    this.notifications.correctionDecided(approved);
    return approved;
  }

  async rejectCorrection(requester: JwtPayload, id: number) {
    await this.assertCanReviewCorrection(requester, id);
    const rejected = await this.attendanceRepository.rejectCorrection(
      id,
      requester.sub,
    );
    await this.audit.record({
      action: 'attendance_correction.rejected',
      entityType: 'attendance_correction',
      entityId: id,
      metadata: {
        employeeId: rejected.employeeId,
        workDate: rejected.workDate,
      },
    });
    this.notifications.correctionDecided(rejected);
    return rejected;
  }

  /** Nobody reviews their own; managers only their reports. */
  private async assertCanReviewCorrection(requester: JwtPayload, id: number) {
    const correction = await this.attendanceRepository.findCorrectionById(id);
    if (!correction) {
      throw new NotFoundException('Attendance correction not found');
    }

    const me = await this.employeeService.findOptionalByUserId(requester.sub);
    if (me?.id === correction.employeeId) {
      throw new ForbiddenException(
        'You cannot review your own attendance correction',
      );
    }
    if (ATTENDANCE_ADMIN_ROLES.includes(requester.role)) return;

    if (requester.role === UserRole.Manager && me) {
      const reports = await this.employeeService.findReports(me.id);
      if (reports.some((r) => r.id === correction.employeeId)) return;
    }
    throw new ForbiddenException(
      'You cannot review this attendance correction',
    );
  }

  private assertValidShift(checkInAt: Date, checkOutAt: Date | null) {
    if (!checkOutAt) return;
    if (checkOutAt <= checkInAt) {
      throw new BadRequestException('Check-out must be after check-in');
    }
    if (
      checkOutAt.getTime() - checkInAt.getTime() >
      MAX_SHIFT_HOURS * 3600_000
    ) {
      throw new BadRequestException(
        `A shift cannot be longer than ${MAX_SHIFT_HOURS} hours`,
      );
    }
  }

  private async reportIds(userId: number) {
    const me = await this.employeeService.findByUserId(userId);
    const reports = await this.employeeService.findReports(me.id);
    return reports.map((r) => r.id);
  }

  /** Only active employees record attendance (on-leave staff cannot). */
  private async findActiveEmployee(userId: number) {
    const employee = await this.employeeService.findByUserId(userId);

    if (employee.status !== EmployeeStatus.Active) {
      throw new ForbiddenException(
        `Attendance cannot be recorded while status is ${employee.status}`,
      );
    }

    return employee;
  }

  /** Super admin/Admin/HR see anyone; managers see themselves and anyone below them. */
  private async assertCanView(requester: JwtPayload, targetEmployeeId: number) {
    if (ATTENDANCE_ADMIN_ROLES.includes(requester.role)) return;

    const me = await this.employeeService.findByUserId(requester.sub);
    if (me.id === targetEmployeeId) return;

    if (requester.role === UserRole.Manager) {
      const reports = await this.employeeService.findReports(me.id);
      if (reports.some((r) => r.id === targetEmployeeId)) return;
    }
    throw new ForbiddenException('You cannot view this employee’s attendance');
  }
}
