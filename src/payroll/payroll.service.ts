import { Injectable } from '@nestjs/common';
import { PayrollRepository } from './payroll.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { JwtPayload } from '../auth/auth.types.js';

@Injectable()
export class PayrollService {
  constructor(
    private readonly payrollRepository: PayrollRepository,
    private readonly employeeService: EmployeesService,
  ) {}

  async generate(month: string) {
    return await this.payrollRepository.generate(month);
  }

  async approve(requester: JwtPayload, runId: number) {
    const approver = await this.employeeService.findByUserId(requester.sub);
    return await this.payrollRepository.approve(runId, approver.id);
  }

  async markPaid(runId: number) {
    return await this.payrollRepository.markPaid(runId);
  }

  async payslipsForRun(runId: number) {
    return await this.payrollRepository.payslipsForRun(runId);
  }

  async myPaySlips(userId: number) {
    const employee = await this.employeeService.findByUserId(userId);
    return await this.payrollRepository.payslipsForEmployee(employee.id);
  }
}
