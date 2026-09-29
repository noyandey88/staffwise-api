import { EmployeeStatus } from '../../employees/employees.enum.js';
import { UserResponseDto } from './user-response.dto.js';

export class UserEmployeeDto {
  id!: number;
  departmentId!: number;
  departmentName!: string;
  managerId!: number | null;
  jobTitle!: string;
  status!: EmployeeStatus;
  hiredAt!: string;
}

/** GET /users/me: the user plus their employee record (null if none). */
export class UserProfileResponseDto extends UserResponseDto {
  employee!: UserEmployeeDto | null;
}
