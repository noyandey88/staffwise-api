/**
 * Values before any attendance policy exists (and the migration's seed).
 * At runtime use AttendancePolicyService / the SQL helpers instead.
 */
export const DEFAULT_ATTENDANCE_POLICY = {
  timezone: 'Asia/Dhaka',
  workStartTime: '09:00',
  lateGraceMinutes: 15,
  standardWorkMinutes: 8 * 60,
  correctionWindowDays: 30,
  maxShiftHours: 24,
  unapprovedRemoteCheckIn: 'block',
  officeCheckInVerification: 'none',
} as const;
