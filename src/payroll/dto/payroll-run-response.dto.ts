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
