import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RemoteWorkRepository } from './remote-work.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationService } from '../mail/notification.service.js';
import {
  CreateRemoteWorkRequestDto,
  RemoteWorkQueryDto,
} from './dto/remote-work.dto.js';
import { addDays, today } from '../attendance/attendance.util.js';
import { pageWindow, paginated } from '../common/utils/pagination.util.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { UserRole } from '../user/user.types.js';
import type { RemoteWorkRequest } from '../database/schema/remote-work.schema.js';

const REMOTE_WORK_ADMIN_ROLES: readonly UserRole[] = [
  UserRole.SuperAdmin,
  UserRole.Admin,
  UserRole.Hr,
];
/** Longest single request; longer arrangements belong in a work arrangement. */
const MAX_REQUEST_DAYS = 31;

@Injectable()
export class RemoteWorkService {
  constructor(
    private readonly repository: RemoteWorkRepository,
    private readonly employeesService: EmployeesService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  async request(userId: number, dto: CreateRemoteWorkRequestDto) {
    const me = await this.employeesService.findByUserId(userId);
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must not be before startDate');
    }
    if (dto.startDate < today()) {
      throw new BadRequestException(
        'Remote work cannot be requested for past days',
      );
    }
    if (dto.endDate > addDays(dto.startDate, MAX_REQUEST_DAYS - 1)) {
      throw new BadRequestException(
        `A request can cover at most ${MAX_REQUEST_DAYS} days; ask HR to change your work arrangement instead`,
      );
    }
    const row = await this.repository.create({
      employeeId: me.id,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
    });
    if (!row) {
      throw new ConflictException(
        'This overlaps a pending or approved remote-work request',
      );
    }
    this.notifications.remoteWorkSubmitted(row);
    return row;
  }

  async mine(userId: number) {
    const me = await this.employeesService.findByUserId(userId);
    return this.repository.findByEmployee(me.id);
  }

  async cancel(userId: number, id: number) {
    const me = await this.employeesService.findByUserId(userId);
    const row = await this.repository.decide(
      id,
      { status: 'cancelled' },
      me.id,
    );
    if (row) return row;
    const existing = await this.repository.findById(id);
    if (!existing || existing.employeeId !== me.id) {
      throw new NotFoundException('Remote-work request not found');
    }
    throw new ConflictException('Only pending requests can be cancelled');
  }

  /** Admin/HR: everyone. Managers: their (recursive) reports. */
  async list(requester: JwtPayload, query: RemoteWorkQueryDto) {
    let employeeIds: number[] | undefined;
    if (!REMOTE_WORK_ADMIN_ROLES.includes(requester.role)) {
      employeeIds = await this.reportIds(requester.sub);
      if (
        query.employeeId !== undefined &&
        !employeeIds.includes(query.employeeId)
      ) {
        throw new ForbiddenException(
          "You cannot view this employee's requests",
        );
      }
    }
    if (query.employeeId !== undefined) employeeIds = [query.employeeId];
    const window = pageWindow(query);
    const { items, total } = await this.repository.findPage(
      { employeeIds, status: query.status },
      window,
    );
    return paginated(items, total, window);
  }

  async approve(requester: JwtPayload, id: number) {
    return this.decide(requester, id, 'approved');
  }

  async reject(requester: JwtPayload, id: number) {
    return this.decide(requester, id, 'rejected');
  }

  /** Used at check-in. */
  async approvedOn(employeeId: number, date: string) {
    return this.repository.approvedOn(employeeId, date);
  }

  private async decide(
    requester: JwtPayload,
    id: number,
    status: 'approved' | 'rejected',
  ) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Remote-work request not found');
    await this.assertCanReview(requester, existing);
    const row = await this.repository.decide(id, {
      status,
      reviewedBy: requester.sub,
      reviewedAt: new Date(),
    });
    if (!row)
      throw new ConflictException(`Only pending requests can be ${status}`);
    await this.audit.record({
      action: `remote_work.${status}`,
      entityType: 'remote_work_request',
      entityId: id,
      metadata: {
        employeeId: row.employeeId,
        startDate: row.startDate,
        endDate: row.endDate,
      },
    });
    this.notifications.remoteWorkDecided(row);
    return row;
  }

  /** Nobody reviews their own; managers only their reports. */
  private async assertCanReview(
    requester: JwtPayload,
    request: RemoteWorkRequest,
  ) {
    const me = await this.employeesService.findOptionalByUserId(requester.sub);
    if (me?.id === request.employeeId) {
      throw new ForbiddenException('You cannot review your own request');
    }
    if (REMOTE_WORK_ADMIN_ROLES.includes(requester.role)) return;
    if (requester.role === UserRole.Manager && me) {
      const reports = await this.employeesService.findReports(me.id);
      if (reports.some((r) => r.id === request.employeeId)) return;
    }
    throw new ForbiddenException('You cannot review this request');
  }

  private async reportIds(userId: number) {
    const me = await this.employeesService.findByUserId(userId);
    return (await this.employeesService.findReports(me.id)).map((r) => r.id);
  }
}
