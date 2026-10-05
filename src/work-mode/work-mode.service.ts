import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkModeRepository } from './work-mode.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { DepartmentService } from '../department/department.service.js';
import { CalendarService } from '../calendar/calendar.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  CreateWorkArrangementDto,
  WorkArrangementQueryDto,
} from './dto/work-arrangement.dto.js';
import { expectedInOffice, resolveArrangement } from './work-mode.resolve.js';
import { today } from '../attendance/attendance.util.js';
import { type JwtPayload } from '../auth/auth.types.js';

@Injectable()
export class WorkModeService {
  constructor(
    private readonly repository: WorkModeRepository,
    private readonly employeesService: EmployeesService,
    private readonly departmentService: DepartmentService,
    private readonly calendarService: CalendarService,
    private readonly audit: AuditService,
  ) {}

  async list(query: WorkArrangementQueryDto) {
    return this.repository.findAll(query);
  }

  async create(userId: number, dto: CreateWorkArrangementDto) {
    if (dto.scope === 'department') {
      if (dto.departmentId === undefined || dto.employeeId !== undefined) {
        throw new BadRequestException(
          "scope 'department' takes departmentId only",
        );
      }
      await this.departmentService.findById(dto.departmentId);
    } else if (dto.scope === 'employee') {
      if (dto.employeeId === undefined || dto.departmentId !== undefined) {
        throw new BadRequestException("scope 'employee' takes employeeId only");
      }
      await this.employeesService.findById(dto.employeeId);
    } else if (dto.departmentId !== undefined || dto.employeeId !== undefined) {
      throw new BadRequestException(
        "scope 'company' takes no departmentId/employeeId",
      );
    }

    const hasDays = dto.officeDays !== undefined;
    const hasQuota = dto.officeDaysPerWeek !== undefined;
    if (dto.mode === 'hybrid' && hasDays === hasQuota) {
      throw new BadRequestException(
        'A hybrid arrangement needs either officeDays or officeDaysPerWeek',
      );
    }
    if (dto.mode !== 'hybrid' && (hasDays || hasQuota)) {
      throw new BadRequestException(
        'officeDays/officeDaysPerWeek only apply to hybrid arrangements',
      );
    }

    const row = await this.repository.create({
      scope: dto.scope,
      departmentId: dto.departmentId ?? null,
      employeeId: dto.employeeId ?? null,
      mode: dto.mode,
      officeDays: dto.officeDays ? [...dto.officeDays].sort() : null,
      officeDaysPerWeek: dto.officeDaysPerWeek ?? null,
      effectiveFrom: dto.effectiveFrom,
      createdBy: userId,
    });
    if (!row) {
      throw new ConflictException(
        `An arrangement for this ${dto.scope} already starts on ${dto.effectiveFrom}`,
      );
    }
    await this.audit.record({
      action: 'work_arrangement.created',
      entityType: 'work_arrangement',
      entityId: row.id,
      after: row,
    });
    return row;
  }

  /** Only arrangements that haven't started can be removed. */
  async remove(id: number) {
    const row = await this.repository.findById(id);
    if (!row)
      throw new NotFoundException(`Work arrangement with id ${id} not found`);
    if (row.effectiveFrom <= today()) {
      throw new ConflictException(
        'Only arrangements that have not started yet can be removed; add a new one instead',
      );
    }
    await this.repository.remove(id);
    await this.audit.record({
      action: 'work_arrangement.deleted',
      entityType: 'work_arrangement',
      entityId: id,
      before: row,
    });
  }

  /** The arrangement governing an employee on a date, with that day's expectation. */
  async resolve(
    employee: { id: number; departmentId: number },
    date = today(),
  ) {
    const candidates = await this.repository.candidatesFor(employee);
    const arrangement = resolveArrangement(candidates, employee, date);
    const workingDay = (await this.calendarService.workingDays(date, date)) > 0;
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    return {
      date,
      ...arrangement,
      workingDay,
      expectedInOffice: workingDay ? expectedInOffice(arrangement, dow) : false,
    };
  }

  async mine(userId: number, date?: string) {
    const me = await this.employeesService.findByUserId(userId);
    return this.resolve(me, date);
  }

  /** Same visibility as the profile: Admin/HR, the employee, their managers. */
  async forEmployee(requester: JwtPayload, employeeId: number, date?: string) {
    const profile = await this.employeesService.findProfile(
      requester,
      employeeId,
    );
    return this.resolve(profile, date);
  }
}
