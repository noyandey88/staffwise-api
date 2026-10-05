import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { leaveStatusEnum } from '../../database/schema/leave.schema.js';
import type { LeaveStatus } from '../leave.repository.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class LeaveRequestQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Employee id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  employeeId?: number;

  @ApiPropertyOptional({ enum: leaveStatusEnum.enumValues })
  @IsOptional()
  @IsIn(leaveStatusEnum.enumValues)
  status?: LeaveStatus;

  @ApiPropertyOptional({
    example: 2026,
    description: 'Requests starting in this year',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}
