import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  dayCountEnum,
  rateBaseEnum,
} from '../../database/schema/payroll.schema.js';
import type { DayCount, RateBase } from '../policy.calc.js';

const BASES = rateBaseEnum.enumValues;
const COUNTS = dayCountEnum.enumValues;
const fixedDays = (what: string) =>
  ApiPropertyOptional({
    example: 30,
    minimum: 1,
    maximum: 31,
    description: `${what} when its divisor is 'fixed' (e.g. 30 or 26)`,
  });

/** Omitted fields keep their current value. */
export class UpdatePayrollPolicyDto {
  @ApiPropertyOptional({
    enum: BASES,
    description: 'Unpaid leave: per-day rate base',
  })
  @IsOptional()
  @IsIn(BASES)
  unpaidLeaveRateBase?: RateBase;

  @ApiPropertyOptional({
    enum: COUNTS,
    description: 'Unpaid leave: days per month',
  })
  @IsOptional()
  @IsIn(COUNTS)
  unpaidLeaveDivisor?: DayCount;

  @fixedDays('Unpaid leave days per month')
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  unpaidLeaveFixedDays?: number;

  @ApiPropertyOptional({
    enum: BASES,
    description: 'Leave encashment: per-day rate base',
  })
  @IsOptional()
  @IsIn(BASES)
  encashmentRateBase?: RateBase;

  @ApiPropertyOptional({
    enum: COUNTS,
    description: 'Leave encashment: days per month',
  })
  @IsOptional()
  @IsIn(COUNTS)
  encashmentDivisor?: DayCount;

  @fixedDays('Encashment days per month')
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  encashmentFixedDays?: number;

  @ApiPropertyOptional({
    enum: COUNTS,
    description: 'Partial months (joiners, leavers): share of the month paid',
  })
  @IsOptional()
  @IsIn(COUNTS)
  proRataMethod?: DayCount;

  @fixedDays('Pro-rata month length')
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  proRataFixedDays?: number;

  @ApiPropertyOptional({ description: 'Pro-rate the month an employee joins' })
  @IsOptional()
  @IsBoolean()
  prorateJoiners?: boolean;

  @ApiPropertyOptional({
    description:
      'Also pro-rate fixed-amount components (percentages always follow pay)',
  })
  @IsOptional()
  @IsBoolean()
  prorateFixedComponents?: boolean;
}

export class PayrollPolicyResponseDto {
  @ApiProperty({ enum: BASES })
  unpaidLeaveRateBase!: RateBase;
  @ApiProperty({ enum: COUNTS })
  unpaidLeaveDivisor!: DayCount;
  unpaidLeaveFixedDays!: number;
  @ApiProperty({ enum: BASES })
  encashmentRateBase!: RateBase;
  @ApiProperty({ enum: COUNTS })
  encashmentDivisor!: DayCount;
  encashmentFixedDays!: number;
  @ApiProperty({ enum: COUNTS })
  proRataMethod!: DayCount;
  proRataFixedDays!: number;
  prorateJoiners!: boolean;
  prorateFixedComponents!: boolean;
  @ApiProperty({ nullable: true, type: Date })
  updatedAt!: Date | null;
}
