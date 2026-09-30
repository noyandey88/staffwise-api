import { ApiProperty } from '@nestjs/swagger';

export class LeaveRequestResponseDto {
  id!: number;
  employeeId!: number;
  leaveTypeId!: number;
  startDate!: string;
  endDate!: string;
  days!: number;
  @ApiProperty({ enum: ['pending', 'approved', 'rejected', 'cancelled'] })
  status!: string;
  @ApiProperty({ nullable: true, type: String })
  reason!: string | null;
  @ApiProperty({ nullable: true, type: Number })
  reviewedBy!: number | null;
  @ApiProperty({ nullable: true, type: Date })
  reviewedAt!: Date | null;
}
