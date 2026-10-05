import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NoticeRepository } from './notice.repository.js';
import { CreateNoticeDto } from './dto/create-notice.dto.js';
import { UpdateNoticeDto } from './dto/update-notice.dto.js';
import { EmployeesService } from '../employees/employees.service.js';
import { DepartmentService } from '../department/department.service.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { UserRole } from '../user/user.types.js';
import { type Notice } from '../database/schema/notice.schema.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { pageWindow, paginated } from '../common/utils/pagination.util.js';

/** Roles that manage notices and see every department's. */
export const NOTICE_MANAGER_ROLES: readonly UserRole[] = [
  UserRole.SuperAdmin,
  UserRole.Admin,
  UserRole.Hr,
];

@Injectable()
export class NoticeService {
  constructor(
    private readonly noticeRepository: NoticeRepository,
    private readonly employeesService: EmployeesService,
    private readonly departmentService: DepartmentService,
  ) {}

  async create(userId: number, dto: CreateNoticeDto) {
    if (dto.departmentId != null) {
      await this.departmentService.findById(dto.departmentId);
    }
    const publishedAt = dto.publishedAt
      ? new Date(dto.publishedAt)
      : new Date();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    this.assertWindow(publishedAt, expiresAt);

    return await this.noticeRepository.create({
      title: dto.title,
      body: dto.body,
      departmentId: dto.departmentId ?? null,
      pinned: dto.pinned ?? false,
      publishedAt,
      expiresAt,
      createdBy: userId,
    });
  }

  /** Management view: every notice, scheduled and expired included. */
  async findAll(query: PaginationQueryDto) {
    const window = pageWindow(query);
    const { items, total } = await this.noticeRepository.findPage(window);
    return paginated(items, total, window);
  }

  /** Live notices for the caller: managers see all, others theirs. */
  async feed(requester: JwtPayload) {
    const scope = await this.departmentScope(requester);
    return await this.noticeRepository.findActive(new Date(), scope);
  }

  /** Non-managers get 404 for notices outside their feed (no leaking). */
  async findOne(requester: JwtPayload, id: number) {
    const notice = await this.findById(id);
    if (NOTICE_MANAGER_ROLES.includes(requester.role)) return notice;

    const scope = await this.departmentScope(requester);
    if (!this.isLive(notice, new Date()) || !this.inScope(notice, scope)) {
      throw new NotFoundException(`Notice with id ${id} not found`);
    }
    return notice;
  }

  async update(id: number, dto: UpdateNoticeDto) {
    const existing = await this.findById(id);
    if (dto.departmentId != null) {
      await this.departmentService.findById(dto.departmentId);
    }

    const publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : undefined;
    const expiresAt =
      dto.expiresAt === undefined
        ? undefined
        : dto.expiresAt === null
          ? null
          : new Date(dto.expiresAt);
    this.assertWindow(
      publishedAt ?? existing.publishedAt,
      expiresAt === undefined ? existing.expiresAt : expiresAt,
    );

    // IsOptional also lets null through; only departmentId/expiresAt may clear.
    const changes = {
      title: dto.title ?? undefined,
      body: dto.body ?? undefined,
      departmentId: dto.departmentId,
      pinned: dto.pinned ?? undefined,
      publishedAt,
      expiresAt,
    };
    if (Object.values(changes).every((v) => v === undefined)) return existing;

    return await this.noticeRepository.update(id, changes);
  }

  async remove(id: number) {
    await this.findById(id);
    await this.noticeRepository.remove(id);
  }

  private async findById(id: number) {
    const notice = await this.noticeRepository.findById(id);
    if (!notice) throw new NotFoundException(`Notice with id ${id} not found`);
    return notice;
  }

  /** undefined = every department; otherwise the caller's department. */
  private async departmentScope(
    requester: JwtPayload,
  ): Promise<number | undefined> {
    if (NOTICE_MANAGER_ROLES.includes(requester.role)) return undefined;
    const employee = await this.employeesService.findByUserId(requester.sub);
    return employee.departmentId;
  }

  private isLive(notice: Notice, now: Date) {
    return (
      notice.publishedAt <= now &&
      (notice.expiresAt === null || notice.expiresAt > now)
    );
  }

  private inScope(notice: Notice, scope: number | undefined) {
    return (
      scope === undefined ||
      notice.departmentId === null ||
      notice.departmentId === scope
    );
  }

  private assertWindow(publishedAt: Date, expiresAt: Date | null) {
    if (expiresAt && expiresAt <= publishedAt) {
      throw new BadRequestException('expiresAt must be after publishedAt');
    }
  }
}
