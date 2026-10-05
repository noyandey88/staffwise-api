import { ApiProperty } from '@nestjs/swagger';

export class AttendanceRecordResponseDto {
  id!: number;
  employeeId!: number;
  workDate!: string;
  checkInAt!: Date;
  checkOutAt!: Date | null;
  @ApiProperty({ nullable: true, enum: ['office', 'remote'] })
  workLocation!: 'office' | 'remote' | null;
  @ApiProperty({
    description: 'Remote on an expected office day without approval',
  })
  outsideArrangement!: boolean;
  workedMinutes!: number | null;
  isLate!: boolean;
  overtimeMinutes!: number | null;
}

export class AttendanceSummaryItemDto {
  employeeId!: number;
  firstName!: string;
  lastName!: string;
  daysPresent!: number;
  lateDays!: number;
  workedMinutes!: number;
  overtimeMinutes!: number;
  rank!: number;
}

export const DAY_STATUSES = [
  'present',
  'late',
  'absent',
  'leave',
  'holiday',
  'weekend',
  'upcoming',
  'not_employed',
] as const;
export type DayStatus = (typeof DAY_STATUSES)[number];

export class AttendanceDayDto {
  @ApiProperty({ example: '2026-10-04' })
  date!: string;

  @ApiProperty({
    enum: DAY_STATUSES,
    description:
      'present/late when a record exists (even on a weekend or holiday); ' +
      'otherwise not_employed (before hire), holiday, weekend, leave ' +
      '(approved), upcoming (today or later), else absent',
  })
  status!: DayStatus;

  @ApiProperty({ nullable: true, type: String })
  holidayName!: string | null;

  @ApiProperty({ nullable: true, type: Date })
  checkInAt!: Date | null;

  @ApiProperty({ nullable: true, type: Date })
  checkOutAt!: Date | null;

  @ApiProperty({ nullable: true, enum: ['office', 'remote'] })
  workLocation!: 'office' | 'remote' | null;

  @ApiProperty({ nullable: true, type: Number })
  workedMinutes!: number | null;
}
