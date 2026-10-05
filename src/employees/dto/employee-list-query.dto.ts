import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { EmployeeStatus } from '../employees.enum.js';

export class EmployeeListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Matches first/last name, email or job title',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional({ description: 'Direct reports of this employee' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerId?: number;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}
