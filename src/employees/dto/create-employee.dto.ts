import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { EmployeeStatus } from '../employees.enum.js';

export class CreateEmployeeDto {
  @IsInt()
  userId!: number;

  @IsInt()
  departmentId!: number;

  @IsOptional()
  @IsInt()
  managerId?: number;

  @IsString()
  @IsNotEmpty()
  jobTitle!: string;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsDateString()
  hiredAt!: string;
}
