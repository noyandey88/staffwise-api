import { ConflictException, Injectable } from '@nestjs/common';
import { SalaryStructureRepository } from './salary-structure.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { CreateSalaryStructureDto } from './dto/salary-structure.dto.js';

@Injectable()
export class SalaryStructureService {
  constructor(
    private readonly salaryStructureRepository: SalaryStructureRepository,
    private readonly employeesService: EmployeesService,
  ) {}

  async findForEmployee(employeeId: number) {
    await this.employeesService.findById(employeeId);
    return await this.salaryStructureRepository.findByEmployee(employeeId);
  }

  async findMine(userId: number) {
    const employee = await this.employeesService.findByUserId(userId);
    return await this.salaryStructureRepository.findByEmployee(employee.id);
  }

  /** Raises or corrections are new rows; history is never rewritten. */
  async create(employeeId: number, dto: CreateSalaryStructureDto) {
    await this.employeesService.findById(employeeId);
    const existing = await this.salaryStructureRepository.findByEffectiveDate(
      employeeId,
      dto.effectiveFrom,
    );
    if (existing) {
      throw new ConflictException(
        `A salary effective from ${dto.effectiveFrom} already exists for this employee`,
      );
    }
    return await this.salaryStructureRepository.create({
      ...dto,
      employeeId,
    });
  }
}
