import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { payrollRunStatusEnum } from '../../database/schema/payroll.schema.js';

export type PayrollRunStatus = (typeof payrollRunStatusEnum.enumValues)[number];

export class PayrollRunQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: payrollRunStatusEnum.enumValues })
  @IsOptional()
  @IsIn(payrollRunStatusEnum.enumValues)
  status?: PayrollRunStatus;

  @ApiPropertyOptional({
    example: 2026,
    description: 'Runs for months in this year',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}
