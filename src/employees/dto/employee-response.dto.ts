// dto/employee-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  BloodGroup,
  EmployeeStatus,
  EmploymentType,
  Gender,
} from '../employees.enum.js';

/** Directory entry: what any signed-in user may see about a colleague. */
export class EmployeeDirectoryDto {
  id!: number;
  employeeCode!: string;
  userId!: number;
  firstName!: string;
  lastName!: string;
  email!: string;
  jobTitle!: string;
  departmentId!: number;
  departmentName!: string;
  @ApiProperty({ nullable: true, type: Number })
  managerId!: number | null;
  @ApiProperty({ enum: EmployeeStatus })
  status!: EmployeeStatus;
  @ApiProperty({ enum: EmploymentType })
  employmentType!: EmploymentType;
  hiredAt!: string;
}

/** The full employees row (Admin/HR create/update responses). */
export class EmployeeResponseDto {
  id!: number;
  userId!: number;
  employeeCode!: string;
  departmentId!: number;
  @ApiProperty({ nullable: true, type: Number })
  managerId!: number | null;
  jobTitle!: string;
  @ApiProperty({ enum: EmployeeStatus })
  status!: EmployeeStatus;
  @ApiProperty({ enum: EmploymentType })
  employmentType!: EmploymentType;
  hiredAt!: string;
  @ApiProperty({ nullable: true, type: String })
  probationEndDate!: string | null;
  @ApiProperty({ nullable: true, type: String })
  contractEndDate!: string | null;
  @ApiProperty({ nullable: true, type: String })
  dateOfBirth!: string | null;
  @ApiProperty({ nullable: true, enum: Gender })
  gender!: Gender | null;
  @ApiProperty({ nullable: true, enum: BloodGroup })
  bloodGroup!: BloodGroup | null;
  @ApiProperty({ nullable: true, type: String })
  nationalId!: string | null;
  @ApiProperty({ nullable: true, type: String })
  phone!: string | null;
  @ApiProperty({ nullable: true, type: String })
  presentAddress!: string | null;
  @ApiProperty({ nullable: true, type: String })
  permanentAddress!: string | null;
  @ApiProperty({ nullable: true, type: String })
  emergencyContactName!: string | null;
  @ApiProperty({ nullable: true, type: String })
  emergencyContactRelationship!: string | null;
  @ApiProperty({ nullable: true, type: String })
  emergencyContactPhone!: string | null;
  @ApiProperty({ nullable: true, type: Date })
  createdAt!: Date | null;
  @ApiProperty({ nullable: true, type: Date })
  updatedAt!: Date | null;
}

/** Full profile: the row plus names (Admin/HR, the employee, their managers). */
export class EmployeeProfileDto extends EmployeeResponseDto {
  firstName!: string;
  lastName!: string;
  email!: string;
  departmentName!: string;
  @ApiProperty({ nullable: true, type: String, example: 'Max Lead' })
  managerName!: string | null;
}

export class DepartmentHistoryEntryDto {
  departmentId!: number;
  departmentName!: string;
  @ApiProperty({ example: '2026-10-01' })
  effectiveFrom!: string;
}
