import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AttendanceRepository } from './attendance.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { currentMonth, monthRange, today } from './attendance.util.js';
import { UserRole } from '../user/user.types.js';
import { JwtPayload } from '../auth/auth.types.js';
import { EmployeeStatus } from '../employees/employees.enum.js';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly employeeService: EmployeesService,
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
    if (
      requester.role === UserRole.SuperAdmin ||
      requester.role === UserRole.Admin ||
      requester.role === UserRole.Hr
    )
      return;

    const me = await this.employeeService.findByUserId(requester.sub);
    if (me.id === targetEmployeeId) return;

    if (requester.role === UserRole.Manager) {
      const reports = await this.employeeService.findReports(me.id);
      if (reports.some((r) => r.id === targetEmployeeId)) return;
    }
    throw new ForbiddenException('You cannot view this employee’s attendance');
  }
}
