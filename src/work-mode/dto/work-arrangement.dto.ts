import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { IsDateOnly } from '../../common/decorators/is-date-only.decorator.js';
import {
  workArrangementScopeEnum,
  workModeEnum,
  type WorkArrangementScope,
  type WorkMode,
} from '../../database/schema/work-arrangement.schema.js';

export class CreateWorkArrangementDto {
  @ApiProperty({
    enum: workArrangementScopeEnum.enumValues,
    description: 'employee > department > company; the most specific wins',
  })
  @IsIn(workArrangementScopeEnum.enumValues)
  scope!: WorkArrangementScope;

  @ApiPropertyOptional({ description: "Required for scope 'department'" })
  @IsOptional()
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional({ description: "Required for scope 'employee'" })
  @IsOptional()
  @IsInt()
  employeeId?: number;

  @ApiProperty({ enum: workModeEnum.enumValues })
  @IsIn(workModeEnum.enumValues)
  mode!: WorkMode;

  @ApiPropertyOptional({
    example: [0, 1, 2],
    type: [Number],
    description:
      'Hybrid with fixed office days (0 = Sunday … 6 = Saturday). Give this or officeDaysPerWeek.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  officeDays?: number[];

  @ApiPropertyOptional({
    example: 3,
    description:
      'Hybrid with a weekly office quota, any days. Give this or officeDays.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  officeDaysPerWeek?: number;

  @ApiProperty({ example: '2026-11-01' })
  @IsDateOnly()
  effectiveFrom!: string;
}

export class WorkArrangementQueryDto {
  @ApiPropertyOptional({ enum: workArrangementScopeEnum.enumValues })
  @IsOptional()
  @IsIn(workArrangementScopeEnum.enumValues)
  scope?: WorkArrangementScope;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  employeeId?: number;
}

export class ResolvedArrangementQueryDto {
  @ApiPropertyOptional({
    example: '2026-11-03',
    description: 'Defaults to today',
  })
  @IsOptional()
  @IsDateOnly()
  date?: string;
}

export class WorkArrangementResponseDto {
  id!: number;
  @ApiProperty({ enum: workArrangementScopeEnum.enumValues })
  scope!: WorkArrangementScope;
  @ApiProperty({ nullable: true, type: Number })
  departmentId!: number | null;
  @ApiProperty({ nullable: true, type: Number })
  employeeId!: number | null;
  @ApiProperty({ enum: workModeEnum.enumValues })
  mode!: WorkMode;
  @ApiProperty({ nullable: true, type: [Number] })
  officeDays!: number[] | null;
  @ApiProperty({ nullable: true, type: Number })
  officeDaysPerWeek!: number | null;
  @ApiProperty({ example: '2026-11-01' })
  effectiveFrom!: string;
}

export class ResolvedArrangementResponseDto {
  @ApiProperty({ example: '2026-11-03' })
  date!: string;
  @ApiProperty({ enum: workModeEnum.enumValues })
  mode!: WorkMode;
  @ApiProperty({ nullable: true, type: [Number] })
  officeDays!: number[] | null;
  @ApiProperty({ nullable: true, type: Number })
  officeDaysPerWeek!: number | null;
  @ApiProperty({ enum: ['employee', 'department', 'company', 'default'] })
  source!: string;
  @ApiProperty({ nullable: true, type: Number })
  arrangementId!: number | null;
  @ApiProperty({ nullable: true, type: String })
  effectiveFrom!: string | null;
  @ApiProperty({ description: 'Not a weekend or public holiday' })
  workingDay!: boolean;
  @ApiProperty({
    nullable: true,
    type: Boolean,
    description:
      'Expected in the office that day (false on non-working days; null = their choice)',
  })
  expectedInOffice!: boolean | null;
}
