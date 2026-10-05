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
  dateOfBirth!: string | null;
  createdAt!: Date | null;
  updatedAt!: Date | null;
}

/** List row: the employee plus who they are and where they sit. */
export class EmployeeListItemDto extends EmployeeResponseDto {
  firstName!: string;
  lastName!: string;
  email!: string;
  departmentName!: string;
}
