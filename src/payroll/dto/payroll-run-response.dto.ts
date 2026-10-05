import { ApiProperty } from '@nestjs/swagger';

export class PayrollRunResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '2026-09-01' })
  month!: string;

  @ApiProperty({ enum: ['draft', 'approved', 'paid'] })
  status!: string;

  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty({ nullable: true, type: Date })
  approvedAt!: Date | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'User id of the approver',
  })
  approvedBy!: number | null;
}

/** A run with its payslip totals (list and detail views). */
export class PayrollRunSummaryDto extends PayrollRunResponseDto {
  @ApiProperty({ example: 42 })
  payslipCount!: number;

  @ApiProperty({ example: '2350000.00', description: 'Sum of gross pay' })
  totalGross!: string;

  @ApiProperty({ example: '42000.00' })
  totalDeductions!: string;

  @ApiProperty({ example: '2308000.00' })
  totalNet!: string;
}
