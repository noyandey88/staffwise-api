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

  @ApiProperty({ example: '1666.67' })
  deductions!: string;

  @ApiProperty({ example: '53333.33' })
  netPay!: string;

  @ApiProperty({ example: 1 })
  unpaidLeaveDays!: number;

  @ApiProperty()
  createdAt!: Date;
}
