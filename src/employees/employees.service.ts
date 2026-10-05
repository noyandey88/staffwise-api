import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeesRepository } from './employees.repository.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { EmployeeListQueryDto } from './dto/employee-list-query.dto.js';
import { pageWindow, paginated } from '../common/utils/pagination.util.js';
import { SIGN_IN_BLOCKED_STATUSES } from './employees.enum.js';
import { EmployeeContactDto } from './dto/employee-contact.dto.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { UserRole } from '../user/user.types.js';

/** Roles that see every employee's full profile. */
const PROFILE_ADMIN_ROLES: readonly UserRole[] = [
  UserRole.SuperAdmin,
  UserRole.Admin,
  UserRole.Hr,
];
import { today } from '../attendance/attendance.util.js';
import { AuditService } from '../audit/audit.service.js';

const DEFAULT_BIRTHDAY_WINDOW_DAYS = 30;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employeesRepository: EmployeesRepository,
    private readonly audit: AuditService,
  ) {}

  /** EMP-NNNNN is reserved for generated codes, so HR's own can never collide later. */
  private assertCustomCode(code: string | undefined) {
    if (code && /^EMP-\d+$/i.test(code)) {
      throw new BadRequestException(
        'employeeCode EMP-<number> is reserved for generated codes',
      );
    }
  }

  /**
   * A manager must exist, not be the employee, and not sit below them
   * (that would make a reporting cycle the recursive queries never leave).
   */
  private async assertValidManager(
    employeeId: number | undefined,
    managerId: number | null | undefined,
  ) {
    if (managerId === undefined || managerId === null) return;
    if (managerId === employeeId) {
      throw new BadRequestException('An employee cannot manage themselves');
    }
    if (!(await this.employeesRepository.findById(managerId))) {
      throw new BadRequestException(`Manager with id ${managerId} not found`);
    }
    if (employeeId !== undefined) {
      const reports = await this.employeesRepository.findReports(employeeId);
      if (reports.some((r) => r.id === managerId)) {
        throw new BadRequestException(
          'The manager reports to this employee; that would create a cycle',
        );
      }
    }
  }

  async create(data: CreateEmployeeDto) {
    const existing = await this.employeesRepository.findByUserId(data.userId);

    if (existing) {
      throw new ConflictException(
        'This user is already linked to an employee record',
      );
    }

    this.assertCustomCode(data.employeeCode);
    this.assertEmploymentDates(data);
    await this.assertValidManager(undefined, data.managerId);
    const employee = await this.employeesRepository.create(data);
    await this.audit.record({
      action: 'employee.created',
      entityType: 'employee',
      entityId: employee.id,
      after: employee,
    });
    return employee;
  }

  async findAll() {
    return await this.employeesRepository.findAll();
  }

  async findPage(query: EmployeeListQueryDto) {
    const window = pageWindow(query);
    const { items, total } = await this.employeesRepository.findPage(
      {
        search: query.search?.trim() || undefined,
        departmentId: query.departmentId,
        managerId: query.managerId,
        status: query.status,
      },
      window,
    );
    return paginated(items, total, window);
  }

  /** Direct reports, or the whole subtree with `all`; current staff only. */
  async reportsOf(id: number, all = false) {
    await this.findById(id);
    const rows = await this.employeesRepository.findReports(id);
    const depthById = new Map(
      rows.filter((r) => all || r.depth === 1).map((r) => [r.id, r.depth]),
    );
    const entries = await this.employeesRepository.findDirectoryEntries([
      ...depthById.keys(),
    ]);
    return entries
      .filter((e) => !SIGN_IN_BLOCKED_STATUSES.includes(e.status))
      .map((e) => ({ ...e, depth: Number(depthById.get(e.id)) }))
      .sort(
        (a, b) =>
          a.depth - b.depth ||
          a.firstName.localeCompare(b.firstName) ||
          a.id - b.id,
      );
  }

  /** Direct manager first, top of the org last. */
  async managerChain(id: number) {
    await this.findById(id);
    const ids = await this.employeesRepository.findManagerChain(id);
    const entries = await this.employeesRepository.findDirectoryEntries(ids);
    const byId = new Map(entries.map((e) => [e.id, e]));
    return ids.map((managerId) => byId.get(managerId)!).filter(Boolean);
  }

  /**
   * Current staff as a tree. Roots are people without a (current) manager;
   * someone whose manager has left is promoted to a root, not hidden.
   */
  async orgChart(rootId?: number) {
    type Node = Awaited<
      ReturnType<EmployeesRepository['findDirectory']>
    >[number] & { reports: Node[] };
    const people = await this.employeesRepository.findDirectory(
      SIGN_IN_BLOCKED_STATUSES,
    );
    const nodes = new Map<number, Node>(
      people.map((p) => [p.id, { ...p, reports: [] }]),
    );
    const roots: Node[] = [];
    for (const node of nodes.values()) {
      const parent =
        node.managerId === null ? undefined : nodes.get(node.managerId);
      (parent ? parent.reports : roots).push(node);
    }
    if (rootId === undefined) return roots;
    const root = nodes.get(rootId);
    if (!root) {
      throw new NotFoundException(`Employee with id ${rootId} not found`);
    }
    return [root];
  }

  /** Directory view of a colleague: no personal details. */
  async findDirectoryEntry(id: number) {
    const entry = await this.employeesRepository.findDirectoryEntry(id);
    if (!entry) throw new NotFoundException(`Employee with id ${id} not found`);
    return entry;
  }

  /** Full profile: Admin/HR any; others themselves; managers their reports. */
  async findProfile(requester: JwtPayload, id: number) {
    const profile = await this.employeesRepository.findProfile(id);
    if (!profile)
      throw new NotFoundException(`Employee with id ${id} not found`);
    if (PROFILE_ADMIN_ROLES.includes(requester.role)) return profile;

    const me = await this.employeesRepository.findByUserId(requester.sub);
    if (me?.id === id) return profile;
    if (requester.role === UserRole.Manager && me) {
      const reports = await this.employeesRepository.findReports(me.id);
      if (reports.some((r) => r.id === id)) return profile;
    }
    throw new ForbiddenException("You cannot view this employee's profile");
  }

  /** Full profile without an access check; for documents issued by HR. */
  async profileForDocument(id: number) {
    const profile = await this.employeesRepository.findProfile(id);
    if (!profile)
      throw new NotFoundException(`Employee with id ${id} not found`);
    return profile;
  }

  async myProfile(userId: number) {
    const employee = await this.findByUserId(userId);
    return (await this.employeesRepository.findProfile(employee.id))!;
  }

  /** Self-service: contact details only (see EmployeeContactDto). */
  async updateMyProfile(userId: number, dto: EmployeeContactDto) {
    const employee = await this.findByUserId(userId);
    const changes = {
      phone: dto.phone,
      presentAddress: dto.presentAddress,
      permanentAddress: dto.permanentAddress,
      bloodGroup: dto.bloodGroup,
      emergencyContactName: dto.emergencyContactName,
      emergencyContactRelationship: dto.emergencyContactRelationship,
      emergencyContactPhone: dto.emergencyContactPhone,
    };
    if (Object.values(changes).some((v) => v !== undefined)) {
      const updated = await this.employeesRepository.update(
        employee.id,
        changes,
      );
      await this.audit.record({
        action: 'employee.contact_updated',
        entityType: 'employee',
        entityId: employee.id,
        before: employee,
        after: updated,
      });
    }
    return (await this.employeesRepository.findProfile(employee.id))!;
  }

  private assertEmploymentDates(e: {
    hiredAt: string;
    probationEndDate?: string | null;
    contractEndDate?: string | null;
    dateOfBirth?: string | null;
  }) {
    if (e.probationEndDate && e.probationEndDate < e.hiredAt) {
      throw new BadRequestException('probationEndDate is before hiredAt');
    }
    if (e.contractEndDate && e.contractEndDate < e.hiredAt) {
      throw new BadRequestException('contractEndDate is before hiredAt');
    }
    if (e.dateOfBirth && e.dateOfBirth >= e.hiredAt) {
      throw new BadRequestException('dateOfBirth must be before hiredAt');
    }
  }

  async findById(id: number) {
    const employee = await this.employeesRepository.findById(id);

    if (!employee) {
      throw new NotFoundException(`Employee with id ${id} not found`);
    }

    return employee;
  }

  async findByUserId(userId: number) {
    const employee = await this.employeesRepository.findByUserId(userId);

    if (!employee) {
      throw new NotFoundException(`Employee with userId ${userId} not found`);
    }

    return employee;
  }

  /** For callers that may have no employee record (e.g. the super admin). */
  async findOptionalByUserId(userId: number) {
    return await this.employeesRepository.findByUserId(userId);
  }

  async update(data: UpdateEmployeeDto) {
    // id is an identity column (GENERATED ALWAYS), so it must not be in the SET clause
    const { id, ...changes } = data;
    const existing = await this.findById(id);
    if (changes.employeeCode !== existing.employeeCode) {
      this.assertCustomCode(changes.employeeCode ?? undefined);
    }
    // DTO instances may carry undefined for omitted fields; keep existing ones.
    const defined = Object.fromEntries(
      Object.entries(changes).filter(([, v]) => v !== undefined),
    );
    this.assertEmploymentDates({ ...existing, ...defined });
    await this.assertValidManager(id, changes.managerId);
    const updated = await this.employeesRepository.update(id, changes);
    await this.audit.record({
      action: 'employee.updated',
      entityType: 'employee',
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async delete(id: number) {
    const existing = await this.findById(id);
    await this.employeesRepository.remove(id);
    await this.audit.record({
      action: 'employee.deleted',
      entityType: 'employee',
      entityId: id,
      before: existing,
    });
  }

  async findReports(id: number) {
    await this.findById(id); // 404 if the manager doesn't exist
    return this.employeesRepository.findReports(id);
  }

  /** Former staff are left out; "today" is the attendance-timezone date. */
  async upcomingBirthdays(days = DEFAULT_BIRTHDAY_WINDOW_DAYS) {
    return this.employeesRepository.findUpcomingBirthdays(
      today(),
      days,
      SIGN_IN_BLOCKED_STATUSES,
    );
  }
}
