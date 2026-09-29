export class AttendanceRecordResponseDto {
  id!: number;
  employeeId!: number;
  workDate!: string;
  checkInAt!: Date;
  checkOutAt!: Date | null;
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
