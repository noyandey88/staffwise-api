import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, Matches } from 'class-validator';

// numeric(12, 2): up to 10 integer digits, 2 decimals
const MONEY = /^\d{1,10}(\.\d{1,2})?$/;

export class CreateSalaryStructureDto {
  @ApiProperty({ example: '50000.00', description: 'Monthly base pay' })
  @Matches(MONEY, { message: 'basePay must be a non-negative amount' })
  basePay!: string;

  @ApiProperty({ example: '5000.00', description: 'Monthly allowances' })
  @Matches(MONEY, { message: 'allowances must be a non-negative amount' })
  allowances!: string;

  @ApiProperty({
    example: '2026-09-01',
    description:
      'First date this salary applies. Runs use the latest one effective by month end.',
  })
  @IsDateString({ strict: true })
  effectiveFrom!: string;
}

export class SalaryStructureResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 4 })
  employeeId!: number;

  @ApiProperty({ example: '50000.00' })
  basePay!: string;

  @ApiProperty({ example: '5000.00' })
  allowances!: string;

  @ApiProperty({ example: '2026-09-01' })
  effectiveFrom!: string;

  @ApiProperty({ nullable: true, type: Date })
  createdAt!: Date | null;
}
