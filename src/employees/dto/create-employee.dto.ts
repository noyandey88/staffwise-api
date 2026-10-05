import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { EmployeeStatus, EmploymentType, Gender } from '../employees.enum.js';
import { IsDateOnly } from '../../common/decorators/is-date-only.decorator.js';
import { EmployeeContactDto } from './employee-contact.dto.js';

export class CreateEmployeeDto extends EmployeeContactDto {
  @IsInt()
  userId!: number;

  @ApiPropertyOptional({
    example: 'EMP-00042',
    description:
      'Defaults to the next EMP-NNNNN code; EMP-<number> is reserved for generated codes',
  })
  @IsOptional()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-]{0,19}$/, {
    message:
      'employeeCode must be up to 20 letters, digits or hyphens, starting with a letter or digit',
  })
  employeeCode?: string;

  @IsInt()
  departmentId!: number;

  @IsOptional()
  @IsInt()
  managerId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  jobTitle!: string;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({
    enum: EmploymentType,
    default: EmploymentType.Permanent,
  })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsDateOnly()
  hiredAt!: string;

  @ApiPropertyOptional({ example: '2027-01-01', nullable: true })
  @IsOptional()
  @IsDateOnly()
  probationEndDate?: string | null;

  @ApiPropertyOptional({
    example: '2027-06-30',
    nullable: true,
    description: 'For contract staff',
  })
  @IsOptional()
  @IsDateOnly()
  contractEndDate?: string | null;

  @ApiPropertyOptional({ example: '1995-04-12', nullable: true })
  @IsOptional()
  @IsDateOnly()
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ enum: Gender, nullable: true })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null;

  @ApiPropertyOptional({ example: '1990123456789', nullable: true })
  @IsOptional()
  @Matches(/^[A-Za-z0-9-]{5,30}$/, {
    message: 'nationalId must be 5-30 letters, digits or hyphens',
  })
  nationalId?: string | null;
}
