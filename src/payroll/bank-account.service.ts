import { Injectable, NotFoundException } from '@nestjs/common';
import { BankAccountRepository } from './bank-account.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { CreateBankAccountDto } from './dto/bank-account.dto.js';
import { type EmployeeBankAccount } from '../database/schema/payroll.schema.js';
import { maskAccountNumber } from './payroll.util.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class BankAccountService {
  constructor(
    private readonly bankAccountRepository: BankAccountRepository,
    private readonly employeesService: EmployeesService,
    private readonly audit: AuditService,
  ) {}

  async findForEmployee(employeeId: number) {
    await this.employeesService.findById(employeeId);
    const accounts =
      await this.bankAccountRepository.findByEmployee(employeeId);
    return accounts.map((a) => this.toResponse(a));
  }

  async findMine(userId: number) {
    const employee = await this.employeesService.findByUserId(userId);
    const accounts = await this.bankAccountRepository.findByEmployee(
      employee.id,
    );
    return accounts.map((a) => this.toResponse(a));
  }

  async create(employeeId: number, dto: CreateBankAccountDto) {
    await this.employeesService.findById(employeeId);
    const account = await this.bankAccountRepository.create({
      ...dto,
      employeeId,
    });
    await this.audit.record({
      action: 'bank_account.created',
      entityType: 'bank_account',
      entityId: account.id,
      after: account,
      metadata: { employeeId },
    });
    return this.toResponse(account);
  }

  async setPrimary(id: number) {
    const account = await this.bankAccountRepository.setPrimary(id);
    await this.audit.record({
      action: 'bank_account.primary_set',
      entityType: 'bank_account',
      entityId: id,
      metadata: { employeeId: account.employeeId },
    });
    return this.toResponse(account);
  }

  async remove(id: number) {
    const account = await this.bankAccountRepository.findById(id);
    if (!account) {
      throw new NotFoundException(`Bank account with id ${id} not found`);
    }
    await this.bankAccountRepository.remove(id);
    await this.audit.record({
      action: 'bank_account.deleted',
      entityType: 'bank_account',
      entityId: id,
      before: account,
      metadata: { employeeId: account.employeeId },
    });
  }

  private toResponse(account: EmployeeBankAccount) {
    return {
      id: account.id,
      employeeId: account.employeeId,
      accountHolderName: account.accountHolderName,
      bankName: account.bankName,
      branchName: account.branchName,
      accountNumber: maskAccountNumber(account.accountNumber),
      routingNumber: account.routingNumber,
      isPrimary: account.isPrimary,
      createdAt: account.createdAt,
    };
  }
}
