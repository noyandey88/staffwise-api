import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeesRepository } from './employees.repository.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { EmployeeListQueryDto } from './dto/employee-list-query.dto.js';
import { pageWindow, paginated } from '../common/utils/pagination.util.js';
import { SIGN_IN_BLOCKED_STATUSES } from './employees.enum.js';
import { today } from '../attendance/attendance.util.js';

const DEFAULT_BIRTHDAY_WINDOW_DAYS = 30;

@Injectable()
export class EmployeesService {
  constructor(private readonly employeesRepository: EmployeesRepository) {}

  async create(data: CreateEmployeeDto) {
    const existing = await this.employeesRepository.findByUserId(data.userId);

    if (existing) {
      throw new ConflictException(
        'This user is already linked to an employee record',
      );
    }

    const employee = await this.employeesRepository.create(data);
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
    await this.findById(id);
    return await this.employeesRepository.update(id, changes);
  }

  async delete(id: number) {
    await this.findById(id);
    await this.employeesRepository.remove(id);
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
