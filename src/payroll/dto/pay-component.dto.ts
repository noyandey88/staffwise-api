import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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
import {
  payComponentCalculationEnum,
  payComponentKindEnum,
} from '../../database/schema/payroll.schema.js';

const AMOUNT = /^\d{1,10}(\.\d{1,2})?$/;
const AMOUNT_MESSAGE = 'must be a non-negative number with up to 2 decimals';

export type PayComponentKind = (typeof payComponentKindEnum.enumValues)[number];
export type PayComponentCalculation =
  (typeof payComponentCalculationEnum.enumValues)[number];

export class CreatePayComponentDto {
  @ApiProperty({ example: 'Provident fund' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: payComponentKindEnum.enumValues })
  @IsIn(payComponentKindEnum.enumValues)
  kind!: PayComponentKind;

  @ApiProperty({
    enum: payComponentCalculationEnum.enumValues,
    description:
      'Percentages apply to the salary structure (basic, or basic + allowances)',
  })
  @IsIn(payComponentCalculationEnum.enumValues)
  calculation!: PayComponentCalculation;

  @ApiProperty({
    example: '10.00',
    description: 'Amount, or percentage for percent_*',
  })
  @Matches(AMOUNT, { message: `defaultValue ${AMOUNT_MESSAGE}` })
  defaultValue!: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Apply to every employee without their own assignment',
  })
  @IsOptional()
  @IsBoolean()
  appliesToAll?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Inactive components are skipped',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePayComponentDto extends PartialType(CreatePayComponentDto) {}

export class PayComponentResponseDto {
  id!: number;
  name!: string;
  @ApiProperty({ enum: payComponentKindEnum.enumValues })
  kind!: PayComponentKind;
  @ApiProperty({ enum: payComponentCalculationEnum.enumValues })
  calculation!: PayComponentCalculation;
  @ApiProperty({ example: '10.00' })
  defaultValue!: string;
  appliesToAll!: boolean;
  isActive!: boolean;
}

export class AssignPayComponentDto {
  @IsInt()
  componentId!: number;

  @ApiPropertyOptional({
    example: '5000.00',
    nullable: true,
    description: "Override the component's default (amount or percentage)",
  })
  @IsOptional()
  @Matches(AMOUNT, { message: `value ${AMOUNT_MESSAGE}` })
  value?: string | null;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateOnly()
  effectiveFrom!: string;

  @ApiPropertyOptional({
    example: '2026-06-30',
    nullable: true,
    description: 'Inclusive',
  })
  @IsOptional()
  @IsDateOnly()
  effectiveTo?: string | null;
}

export class UpdateAssignmentDto extends PartialType(AssignPayComponentDto) {}

export class EmployeePayComponentResponseDto {
  id!: number;
  employeeId!: number;
  componentId!: number;
  @ApiProperty({ example: 'Provident fund' })
  componentName!: string;
  @ApiProperty({ nullable: true, type: String })
  value!: string | null;
  effectiveFrom!: string;
  @ApiProperty({ nullable: true, type: String })
  effectiveTo!: string | null;
}

export class PayslipAdjustmentDto {
  @ApiProperty({ example: 'Performance bonus' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label!: string;

  @ApiProperty({ enum: ['earning', 'deduction'] })
  @IsIn(['earning', 'deduction'])
  kind!: 'earning' | 'deduction';

  @ApiProperty({ example: '5000.00' })
  @Matches(AMOUNT, { message: `amount ${AMOUNT_MESSAGE}` })
  amount!: string;
}

export class SetPayslipAdjustmentsDto {
  @ApiProperty({
    type: [PayslipAdjustmentDto],
    description: 'Replaces all one-off adjustments on the payslip',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PayslipAdjustmentDto)
  adjustments!: PayslipAdjustmentDto[];
}
