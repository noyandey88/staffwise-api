import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PayComponentRepository } from './pay-component.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  AssignPayComponentDto,
  CreatePayComponentDto,
  UpdateAssignmentDto,
  UpdatePayComponentDto,
} from './dto/pay-component.dto.js';
import type { PayComponent } from '../database/schema/payroll.schema.js';

/** Percentages above 100 are almost certainly a typo for an amount. */
const MAX_PERCENT = 100;

/**
 * Changes affect runs generated afterwards; existing payslips keep the
 * lines they were generated with (delete a draft run to regenerate it).
 */
@Injectable()
export class PayComponentService {
  constructor(
    private readonly repository: PayComponentRepository,
    private readonly employeesService: EmployeesService,
    private readonly audit: AuditService,
  ) {}

  async findAll() {
    return this.repository.findAll();
  }

  async create(dto: CreatePayComponentDto) {
    this.assertValue(dto.calculation, dto.defaultValue);
    const row = await this.repository.create({
      name: dto.name,
      kind: dto.kind,
      calculation: dto.calculation,
      defaultValue: dto.defaultValue,
      appliesToAll: dto.appliesToAll ?? false,
      isActive: dto.isActive ?? true,
    });
    if (!row)
      throw new ConflictException(`Pay component ${dto.name} already exists`);
    await this.audit.record({
      action: 'pay_component.created',
      entityType: 'pay_component',
      entityId: row.id,
      after: row,
    });
    return row;
  }

  async update(id: number, dto: UpdatePayComponentDto) {
    const existing = await this.find(id);
    this.assertValue(
      dto.calculation ?? existing.calculation,
      dto.defaultValue ?? existing.defaultValue,
    );
    const changes = {
      name: dto.name ?? undefined,
      kind: dto.kind ?? undefined,
      calculation: dto.calculation ?? undefined,
      defaultValue: dto.defaultValue ?? undefined,
      appliesToAll: dto.appliesToAll ?? undefined,
      isActive: dto.isActive ?? undefined,
    };
    if (Object.values(changes).every((v) => v === undefined)) return existing;
    const row = await this.repository.update(id, changes);
    if (row === null)
      throw new ConflictException(`Pay component ${dto.name} already exists`);
    await this.audit.record({
      action: 'pay_component.updated',
      entityType: 'pay_component',
      entityId: id,
      before: existing,
      after: row,
    });
    return row;
  }

  async assignments(employeeId: number) {
    await this.employeesService.findById(employeeId);
    return this.repository.findAssignments(employeeId);
  }

  async assign(employeeId: number, dto: AssignPayComponentDto) {
    await this.employeesService.findById(employeeId);
    const component = await this.find(dto.componentId);
    if (dto.value != null) this.assertValue(component.calculation, dto.value);
    this.assertPeriod(dto.effectiveFrom, dto.effectiveTo ?? null);
    const row = await this.repository.createAssignment({
      employeeId,
      componentId: component.id,
      value: dto.value ?? null,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo ?? null,
    });
    await this.audit.record({
      action: 'pay_component.assigned',
      entityType: 'employee_pay_component',
      entityId: row.id,
      after: row,
      metadata: { employeeId, component: component.name },
    });
    return { ...row, componentName: component.name };
  }

  async updateAssignment(id: number, dto: UpdateAssignmentDto) {
    const existing = await this.repository.findAssignment(id);
    if (!existing) throw new NotFoundException('Assignment not found');
    const component = await this.find(dto.componentId ?? existing.componentId);
    const value = dto.value === undefined ? existing.value : dto.value;
    if (value != null) this.assertValue(component.calculation, value);
    const effectiveFrom = dto.effectiveFrom ?? existing.effectiveFrom;
    const effectiveTo =
      dto.effectiveTo === undefined ? existing.effectiveTo : dto.effectiveTo;
    this.assertPeriod(effectiveFrom, effectiveTo);
    const row = await this.repository.updateAssignment(id, {
      componentId: component.id,
      value,
      effectiveFrom,
      effectiveTo,
    });
    await this.audit.record({
      action: 'pay_component.assignment_updated',
      entityType: 'employee_pay_component',
      entityId: id,
      before: existing,
      after: row,
      metadata: { employeeId: existing.employeeId, component: component.name },
    });
    return { ...row, componentName: component.name };
  }

  async removeAssignment(id: number) {
    const existing = await this.repository.findAssignment(id);
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.repository.removeAssignment(id);
    await this.audit.record({
      action: 'pay_component.unassigned',
      entityType: 'employee_pay_component',
      entityId: id,
      before: existing,
      metadata: { employeeId: existing.employeeId },
    });
  }

  private async find(id: number) {
    const row = await this.repository.findById(id);
    if (!row)
      throw new NotFoundException(`Pay component with id ${id} not found`);
    return row;
  }

  private assertValue(calculation: PayComponent['calculation'], value: string) {
    if (calculation !== 'fixed' && Number(value) > MAX_PERCENT) {
      throw new BadRequestException(
        `A percentage cannot exceed ${MAX_PERCENT} (got ${value})`,
      );
    }
  }

  private assertPeriod(from: string, to: string | null) {
    if (to && to < from) {
      throw new BadRequestException('effectiveTo is before effectiveFrom');
    }
  }
}
