// dto/employee-response.dto.ts
import { EmployeeStatus } from '../employees.enum.js';

export class EmployeeResponseDto {
  id!: number;
  userId!: number;
  departmentId!: number;
  managerId!: number | null;
  jobTitle!: string;
  status!: EmployeeStatus;
  hiredAt!: string;
  createdAt!: Date | null;
  updatedAt!: Date | null;
}
