import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaveRepository } from './leave.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { CalendarService } from '../calendar/calendar.service.js';
import { CreateLeaveRequestDto } from './dto/create-leave.dto.js';
import {
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto,
} from './dto/leave-type.dto.js';
import { AllocateBalancesDto, SetBalanceDto } from './dto/leave-balance.dto.js';
import { LeaveRequestQueryDto } from './dto/leave-request-query.dto.js';
import { JwtPayload } from '../auth/auth.types.js';
import { UserRole } from '../user/user.types.js';
import { SIGN_IN_BLOCKED_STATUSES } from '../employees/employees.enum.js';
import { today } from '../attendance/attendance.util.js';
import { pageWindow, paginated } from '../common/utils/pagination.util.js';
import { NotificationService } from '../mail/notification.service.js';
import { AuditService } from '../audit/audit.service.js';

/** Roles that see and review every employee's leave. */
const LEAVE_ADMIN_ROLES: readonly UserRole[] = [
  UserRole.SuperAdmin,
  UserRole.Admin,
  UserRole.Hr,
];

@Injectable()
export class LeaveService {
  constructor(
    private readonly leaveRepository: LeaveRepository,
    private readonly employeeService: EmployeesService,
    private readonly calendarService: CalendarService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  // --- requests ---

  /**
   * `days` counts working days only (weekends and public holidays are
   * free). Paid leave needs enough balance up front; approval deducts it.
   */
  async create(userId: number, dto: CreateLeaveRequestDto) {
    const employee = await this.employeeService.findByUserId(userId);
    if (dto.startDate.slice(0, 4) !== dto.endDate.slice(0, 4)) {
      throw new BadRequestException(
        'A leave request cannot span two years; split it at Dec 31',
      );
    }
    const type = await this.findType(dto.leaveTypeId);
    const days = await this.calendarService.workingDays(
      dto.startDate,
      dto.endDate,
    );
    if (days === 0) {
      throw new BadRequestException(
        'The selected dates are all weekends or public holidays',
      );
    }

    if (type.isPaid) {
      const balance = await this.leaveRepository.findBalance(
        employee.id,
        type.id,
        Number(dto.startDate.slice(0, 4)),
      );
      if (!balance || balance.remainingDays < days) {
        throw new ConflictException(
          `Insufficient ${type.name} balance: ${days} working day(s) requested, ` +
            `${balance?.remainingDays ?? 0} remaining`,
        );
      }
    }

    const request = await this.leaveRepository.create(employee.id, {
      leaveTypeId: type.id,
      startDate: dto.startDate,
      endDate: dto.endDate,
      days,
      reason: dto.reason,
    });
    this.notifications.leaveSubmitted(request);
    return request;
  }

  async findMine(userId: number) {
    const employee = await this.employeeService.findByUserId(userId);
    return await this.leaveRepository.findByEmployee(employee.id);
  }

  async cancel(userId: number, requestId: number) {
    const employee = await this.employeeService.findByUserId(userId);
    const cancelled = await this.leaveRepository.cancel(requestId, employee.id);
    if (cancelled) return cancelled;

    const request = await this.leaveRepository.findById(requestId);
    if (!request || request.employeeId !== employee.id) {
      throw new NotFoundException('Leave request not found');
    }
    throw new ConflictException('Only pending requests can be cancelled');
  }

  /** Admin/HR: anyone. Manager: their (recursive) reports. */
  async findRequests(requester: JwtPayload, query: LeaveRequestQueryDto) {
    let employeeIds: number[] | undefined;
    if (!LEAVE_ADMIN_ROLES.includes(requester.role)) {
      employeeIds = await this.reportIds(requester.sub);
      if (query.employeeId !== undefined) {
        if (!employeeIds.includes(query.employeeId)) {
          throw new ForbiddenException("You cannot view this employee's leave");
        }
      }
    }
    if (query.employeeId !== undefined) employeeIds = [query.employeeId];

    const window = pageWindow(query);
    const { items, total } = await this.leaveRepository.findRequests(
      { employeeIds, status: query.status, year: query.year },
      window,
    );
    return paginated(items, total, window);
  }

  async findPending(requester: JwtPayload) {
    if (LEAVE_ADMIN_ROLES.includes(requester.role))
      return await this.leaveRepository.findPendingForEmployees(
        await this.allEmployeeIds(),
      );

    return await this.leaveRepository.findPendingForEmployees(
      await this.reportIds(requester.sub),
    );
  }

  async approve(requester: JwtPayload, requestId: number) {
    await this.assertCanReview(requester, requestId);
    const approved = await this.leaveRepository.approve(
      requestId,
      requester.sub,
    );
    await this.audit.record({
      action: 'leave_request.approved',
      entityType: 'leave_request',
      entityId: requestId,
      metadata: { employeeId: approved.employeeId, days: approved.days },
    });
    this.notifications.leaveDecided(approved);
    return approved;
  }

  async reject(requester: JwtPayload, requestId: number) {
    await this.assertCanReview(requester, requestId);
    const rejected = await this.leaveRepository.reject(
      requestId,
      requester.sub,
    );
    await this.audit.record({
      action: 'leave_request.rejected',
      entityType: 'leave_request',
      entityId: requestId,
      metadata: { employeeId: rejected.employeeId },
    });
    this.notifications.leaveDecided(rejected);
    return rejected;
  }

  /** Nobody reviews their own; managers only their reports. */
  private async assertCanReview(requester: JwtPayload, requestId: number) {
    const request = await this.leaveRepository.findById(requestId);
    if (!request) throw new NotFoundException('Leave request not found');

    const me = await this.employeeService.findOptionalByUserId(requester.sub);
    if (me?.id === request.employeeId) {
      throw new ForbiddenException('You cannot review your own leave request');
    }
    if (LEAVE_ADMIN_ROLES.includes(requester.role)) return;

    if (requester.role === UserRole.Manager && me) {
      const reports = await this.employeeService.findReports(me.id);
      if (reports.some((r) => r.id === request.employeeId)) return;
    }

    throw new ForbiddenException('You cannot review this leave request');
  }

  // --- balances ---

  async myBalances(userId: number, year = this.currentYear()) {
    const employee = await this.employeeService.findByUserId(userId);
    return await this.leaveRepository.balanceForEmployee(employee.id, year);
  }

  async balancesForEmployee(employeeId: number, year = this.currentYear()) {
    await this.employeeService.findById(employeeId);
    return await this.leaveRepository.balanceForEmployee(employeeId, year);
  }

  /**
   * Grants every paid leave type's default days to current staff (or the
   * given employees) for a year. Existing balances are left untouched, so
   * it is safe to re-run, e.g. after hiring.
   */
  async allocate(dto: AllocateBalancesDto) {
    const employees = dto.employeeIds
      ? await Promise.all(
          dto.employeeIds.map((id) => this.employeeService.findById(id)),
        )
      : (await this.employeeService.findAll()).filter(
          (e) => !SIGN_IN_BLOCKED_STATUSES.includes(e.status),
        );
    const types = (await this.leaveRepository.findTypes()).filter(
      (t) => t.isPaid,
    );

    const created = await this.leaveRepository.allocate(
      dto.year,
      employees.map((e) => e.id),
      types,
    );
    await this.audit.record({
      action: 'leave_balance.allocated',
      entityType: 'leave_balance',
      entityId: dto.year,
      metadata: {
        year: dto.year,
        created,
        employeeIds: dto.employeeIds ?? 'all',
      },
    });
    return { created, skipped: employees.length * types.length - created };
  }

  /** Sets one balance outright (manual adjustment, carry-over, correction). */
  async setBalance(dto: SetBalanceDto) {
    await this.employeeService.findById(dto.employeeId);
    const type = await this.findType(dto.leaveTypeId);
    if (!type.isPaid) {
      throw new BadRequestException(
        `${type.name} is unpaid leave and has no balance`,
      );
    }
    const before = await this.leaveRepository.findBalance(
      dto.employeeId,
      dto.leaveTypeId,
      dto.year,
    );
    const balance = await this.leaveRepository.setBalance(
      dto.employeeId,
      dto.leaveTypeId,
      dto.year,
      dto.remainingDays,
    );
    await this.audit.record({
      action: 'leave_balance.set',
      entityType: 'leave_balance',
      entityId: balance.id,
      before: before ? { remainingDays: before.remainingDays } : null,
      after: { remainingDays: balance.remainingDays },
      metadata: {
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        year: dto.year,
      },
    });
    return balance;
  }

  // --- leave types ---

  async findTypes() {
    return await this.leaveRepository.findTypes();
  }

  async createType(dto: CreateLeaveTypeDto) {
    const type = await this.leaveRepository.createType({
      name: dto.name,
      defaultDaysPerYear: dto.defaultDaysPerYear,
      isPaid: dto.isPaid ?? true,
    });
    if (!type) {
      throw new ConflictException(`Leave type ${dto.name} already exists`);
    }
    await this.audit.record({
      action: 'leave_type.created',
      entityType: 'leave_type',
      entityId: type.id,
      after: type,
    });
    return type;
  }

  async updateType(id: number, dto: UpdateLeaveTypeDto) {
    const existing = await this.findType(id);
    const changes = {
      name: dto.name ?? undefined,
      defaultDaysPerYear: dto.defaultDaysPerYear ?? undefined,
      isPaid: dto.isPaid ?? undefined,
    };
    if (Object.values(changes).every((v) => v === undefined)) return existing;

    const type = await this.leaveRepository.updateType(id, changes);
    if (type === null) {
      throw new ConflictException(`Leave type ${dto.name} already exists`);
    }
    await this.audit.record({
      action: 'leave_type.updated',
      entityType: 'leave_type',
      entityId: id,
      before: existing,
      after: type,
    });
    return type;
  }

  private async findType(id: number) {
    const type = await this.leaveRepository.findTypeById(id);
    if (!type)
      throw new NotFoundException(`Leave type with id ${id} not found`);
    return type;
  }

  // --- helpers ---

  private async reportIds(userId: number) {
    const me = await this.employeeService.findByUserId(userId);
    const reports = await this.employeeService.findReports(me.id);
    return reports.map((r) => r.id);
  }

  private async allEmployeeIds() {
    const employees = await this.employeeService.findAll();
    return employees.map((e) => e.id);
  }

  private currentYear() {
    return Number(today().slice(0, 4));
  }
}
