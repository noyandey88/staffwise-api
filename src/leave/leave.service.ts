import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaveRepository } from './leave.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { CreateLeaveRequestDto } from './dto/create-leave.dto.js';
import { calculateDays } from './leave.util.js';
import { JwtPayload } from '../auth/auth.types.js';
import { UserRole } from '../user/user.types.js';

@Injectable()
export class LeaveService {
  constructor(
    private readonly leaveRepository: LeaveRepository,
    private readonly employeeService: EmployeesService,
  ) {}

  async create(userId: number, createLeaveDto: CreateLeaveRequestDto) {
    const employee = await this.employeeService.findByUserId(userId);
    const days = calculateDays(
      createLeaveDto.startDate,
      createLeaveDto.endDate,
    );

    return await this.leaveRepository.create(employee.id, {
      leaveTypeId: createLeaveDto.leaveTypeId,
      startDate: createLeaveDto.startDate,
      endDate: createLeaveDto.endDate,
      days,
      reason: createLeaveDto.reason,
    });
  }

  async findMine(userId: number) {
    const employe = await this.employeeService.findByUserId(userId);
    return await this.leaveRepository.findByEmployee(employe.id);
  }

  async myBalances(userId: number, year = new Date().getFullYear()) {
    const employee = await this.employeeService.findByUserId(userId);
    return await this.leaveRepository.balanceForEmployee(employee.id, year);
  }

  async findPending(requester: JwtPayload) {
    if (
      requester.role === UserRole.SuperAdmin ||
      requester.role === UserRole.Admin ||
      requester.role === UserRole.Hr
    )
      return await this.leaveRepository.findPendingForEmployees(
        await this.allEmployeeIds(),
      );

    const me = await this.employeeService.findByUserId(requester.sub);
    const reports = await this.employeeService.findReports(me.id);
    return await this.leaveRepository.findPendingForEmployees(
      reports.map((r) => r.id),
    );
  }

  async approve(requester: JwtPayload, requestId: number) {
    await this.assertCanReview(requester, requestId);
    return this.leaveRepository.approve(requestId, requester.sub);
  }

  /** Only managers need an employee record (to resolve their reports). */
  private async assertCanReview(requester: JwtPayload, requestId: number) {
    if (
      requester.role === UserRole.SuperAdmin ||
      requester.role === UserRole.Admin ||
      requester.role === UserRole.Hr
    )
      return;

    if (requester.role === UserRole.Manager) {
      const request = await this.leaveRepository.findById(requestId);
      if (!request) throw new NotFoundException('Leave request not found');
      const me = await this.employeeService.findByUserId(requester.sub);
      const reports = await this.employeeService.findReports(me.id);
      if (reports.some((r) => r.id === request.employeeId)) return;
    }

    throw new ForbiddenException('You cannot review this leave request');
  }

  async reject(requester: JwtPayload, requestId: number) {
    await this.assertCanReview(requester, requestId);
    return this.leaveRepository.reject(requestId, requester.sub);
  }

  private async allEmployeeIds() {
    const employees = await this.employeeService.findAll();
    return employees.map((e) => e.id);
  }
}
