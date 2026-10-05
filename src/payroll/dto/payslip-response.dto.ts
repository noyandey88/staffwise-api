import { ApiProperty } from '@nestjs/swagger';

export class PayslipResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 3 })
  payrollRunId!: number;

  @ApiProperty({ example: 4 })
  employeeId!: number;

  @ApiProperty({
    example: '50000.00',
    description: 'Decimal string, to avoid float precision loss',
  })
  basePay!: string;

  @ApiProperty({ example: '5000.00' })
  allowances!: string;

  @ApiProperty({
    example: '57000.00',
    description: 'basePay + allowances + earning lines',
  })
  grossPay!: string;

  @ApiProperty({ example: '1666.67', description: 'Sum of deduction lines' })
  deductions!: string;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        label: { type: 'string', example: 'Provident fund' },
        kind: { type: 'string', enum: ['earning', 'deduction'] },
        amount: { type: 'string', example: '5000.00' },
        source: {
          type: 'string',
          enum: ['component', 'unpaid_leave', 'adjustment'],
        },
        note: { type: 'string', example: '10.00% of basic' },
      },
    },
  })
  lines!: unknown[];

  @ApiProperty({ example: '53333.33' })
  netPay!: string;

  @ApiProperty({ example: 1 })
  unpaidLeaveDays!: number;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'Joined 2026-09-15: 16 of 30 calendar days',
  })
  proRataNote!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Salary account snapshot, set when the run is approved',
  })
  bankAccountHolderName!: string | null;

  @ApiProperty({ nullable: true, type: String })
  bankName!: string | null;

  @ApiProperty({ nullable: true, type: String })
  bankBranchName!: string | null;

  @ApiProperty({ nullable: true, type: String, example: '*********2345' })
  bankAccountNumber!: string | null;

  @ApiProperty({ nullable: true, type: String })
  bankRoutingNumber!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
