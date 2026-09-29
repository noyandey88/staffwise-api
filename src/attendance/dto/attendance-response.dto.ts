import { ApiProperty } from '@nestjs/swagger';

export class AttendanceRecordResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;
  @ApiProperty({ example: 4 })
  employeeId!: number;
  @ApiProperty({ example: '2026-09-28' })
  workDate!: string;
  @ApiProperty()
  checkInAt!: Date;
  @ApiProperty({ nullable: true, type: Date })
  checkOutAt!: Date | null;
  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'null until checked out',
  })
  workedMinutes!: number | null;
  @ApiProperty({ description: 'Checked in after the grace period' })
  isLate!: boolean;
  @ApiProperty({ nullable: true, type: Number })
  overtimeMinutes!: number | null;
}

export class AttendanceSummaryItemDto {
  @ApiProperty({ example: 4 })
  employeeId!: number;
  @ApiProperty({ example: 'Sam' })
  firstName!: string;
  @ApiProperty({ example: 'Ali' })
  lastName!: string;
  @ApiProperty({ example: 21 })
  daysPresent!: number;
  @ApiProperty({ example: 3 })
  lateDays!: number;
  @ApiProperty({ example: 9800 })
  workedMinutes!: number;
  @ApiProperty({ example: 320 })
  overtimeMinutes!: number;
  @ApiProperty({ example: 1, description: 'Rank by total worked minutes' })
  rank!: number;
}
