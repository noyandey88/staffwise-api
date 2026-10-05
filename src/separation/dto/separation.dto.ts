import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsDateOnly } from '../../common/decorators/is-date-only.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import {
  separationStatusEnum,
  separationTypeEnum,
  settlementStatusEnum,
} from '../../database/schema/separation.schema.js';
import type {
  SeparationStatus,
  SeparationType,
} from '../separation.repository.js';

export class ResignDto {
  @ApiProperty({ example: '2026-11-30', description: 'Inclusive' })
  @IsDateOnly()
  lastWorkingDay!: string;

  @ApiProperty({ example: 'Relocating abroad' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class CreateSeparationDto extends ResignDto {
  @IsInt()
  employeeId!: number;

  @ApiProperty({ enum: separationTypeEnum.enumValues })
  @IsIn(separationTypeEnum.enumValues)
  type!: SeparationType;
}

export class ApproveSeparationDto {
  @ApiPropertyOptional({
    example: '2026-11-30',
    description: 'Override the requested last working day',
  })
  @IsOptional()
  @IsDateOnly()
  lastWorkingDay?: string;
}

export class SeparationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: separationStatusEnum.enumValues })
  @IsOptional()
  @IsIn(separationStatusEnum.enumValues)
  status?: SeparationStatus;

  @ApiPropertyOptional({ enum: separationTypeEnum.enumValues })
  @IsOptional()
  @IsIn(separationTypeEnum.enumValues)
  type?: SeparationType;
}

export class SettlementAdjustmentDto {
  @ApiProperty({ example: 'Festival bonus (pro-rata)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label!: string;

  @ApiProperty({ enum: ['earning', 'deduction'] })
  @IsIn(['earning', 'deduction'])
  kind!: 'earning' | 'deduction';

  @ApiProperty({ example: '5000.00', description: 'Positive amount' })
  @Matches(/^\d{1,10}(\.\d{1,2})?$/, {
    message: 'amount must be a positive number with up to 2 decimals',
  })
  amount!: string;
}

export class SetAdjustmentsDto {
  @ApiProperty({
    type: [SettlementAdjustmentDto],
    description: 'Replaces all manual lines',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SettlementAdjustmentDto)
  adjustments!: SettlementAdjustmentDto[];
}

export class SeparationResponseDto {
  id!: number;
  employeeId!: number;
  @ApiProperty({ enum: separationTypeEnum.enumValues })
  type!: SeparationType;
  @ApiProperty({ enum: separationStatusEnum.enumValues })
  status!: SeparationStatus;
  reason!: string;
  @ApiProperty({ example: '2026-11-30' })
  lastWorkingDay!: string;
  @ApiProperty({ nullable: true, type: Number })
  requestedBy!: number | null;
  @ApiProperty({ nullable: true, type: Number })
  reviewedBy!: number | null;
  @ApiProperty({ nullable: true, type: Date })
  reviewedAt!: Date | null;
  @ApiProperty({ nullable: true, type: Date })
  completedAt!: Date | null;
  @ApiProperty({ nullable: true, type: Date })
  createdAt!: Date | null;
}

class SettlementLineDto {
  label!: string;
  @ApiProperty({ enum: ['earning', 'deduction'] })
  kind!: string;
  @ApiProperty({ example: '18333.33' })
  amount!: string;
  @ApiProperty({
    enum: ['salary', 'leave_encashment', 'unpaid_leave', 'manual'],
  })
  source!: string;
  @ApiPropertyOptional()
  note?: string;
}

export class SettlementResponseDto {
  id!: number;
  separationId!: number;
  employeeId!: number;
  @ApiProperty({ enum: settlementStatusEnum.enumValues })
  status!: string;
  @ApiProperty({ example: 'BDT' })
  currency!: string;
  @ApiProperty({ type: [SettlementLineDto] })
  lines!: SettlementLineDto[];
  @ApiProperty({ example: '28333.33' })
  totalEarnings!: string;
  @ApiProperty({ example: '1000.00' })
  totalDeductions!: string;
  @ApiProperty({ example: '27333.33' })
  netPay!: string;
  @ApiProperty({ nullable: true, type: Number })
  finalizedBy!: number | null;
  @ApiProperty({ nullable: true, type: Date })
  finalizedAt!: Date | null;
  @ApiProperty({ nullable: true, type: Date })
  paidAt!: Date | null;
}
