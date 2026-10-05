import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class FormatQueryDto {
  @ApiPropertyOptional({
    enum: ['json', 'csv'],
    default: 'json',
    description: 'csv returns a file (not wrapped in the envelope)',
  })
  @IsOptional()
  @IsIn(['json', 'csv'])
  format?: 'json' | 'csv';
}

export class MonthReportQueryDto extends FormatQueryDto {
  @ApiPropertyOptional({
    example: '2026-09',
    description: 'Defaults to the current month',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month?: string;
}

export class YearReportQueryDto extends FormatQueryDto {
  @ApiPropertyOptional({
    example: 2026,
    description: 'Defaults to the current year',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}

class TodayDto {
  @ApiProperty({ description: 'Checked in (late included)' })
  present!: number;
  @ApiProperty({
    description: 'Checked in at an office (or before work modes)',
  })
  inOffice!: number;
  @ApiProperty({ description: 'Checked in remotely' })
  remote!: number;
  late!: number;
  onLeave!: number;
  @ApiProperty({ description: 'Working today, no check-in yet' })
  notCheckedIn!: number;
  @ApiProperty({ description: 'Weekend or public holiday for them' })
  offToday!: number;
}

class PendingDto {
  leaveRequests!: number;
  attendanceCorrections!: number;
  salaryCertificates!: number;
  resignations!: number;
}

export class DepartmentHeadcountDto {
  departmentId!: number;
  departmentName!: string;
  headcount!: number;
  permanent!: number;
  contract!: number;
  intern!: number;
  partTime!: number;
}

class LatestRunDto {
  id!: number;
  @ApiProperty({ example: '2026-09' })
  month!: string;
  status!: string;
  payslipCount!: number;
  totalNet!: string;
}

class BirthdayDto {
  employeeId!: number;
  firstName!: string;
  lastName!: string;
  @ApiProperty({ example: '10-21' })
  birthday!: string;
  daysUntil!: number;
}

export class OverviewDto {
  @ApiProperty({ description: 'Current staff' })
  headcount!: number;
  @ApiProperty({ type: [DepartmentHeadcountDto] })
  departments!: DepartmentHeadcountDto[];
  @ApiProperty({ example: { joiners: 2, leavers: 1 } })
  thisMonth!: { joiners: number; leavers: number };
  @ApiProperty({ type: TodayDto })
  today!: TodayDto;
  @ApiProperty({ type: PendingDto })
  pending!: PendingDto;
  @ApiProperty({ type: LatestRunDto, nullable: true })
  latestPayrollRun!: LatestRunDto | null;
  @ApiProperty({ type: [BirthdayDto], description: 'Next 7 days' })
  upcomingBirthdays!: BirthdayDto[];
}

export class TeamDashboardDto {
  @ApiProperty({ description: 'Direct and indirect reports (current staff)' })
  teamSize!: number;
  @ApiProperty({ type: TodayDto })
  today!: TodayDto;
  @ApiProperty({ type: PendingDto, description: 'Waiting on you or HR' })
  pending!: PendingDto;
}

export class AttendanceReportRowDto {
  employeeId!: number;
  employeeCode!: string;
  name!: string;
  departmentName!: string;
  present!: number;
  late!: number;
  absent!: number;
  leave!: number;
  holidays!: number;
  workedMinutes!: number;
}

export class LeaveReportRowDto {
  employeeId!: number;
  employeeCode!: string;
  name!: string;
  departmentName!: string;
  leaveType!: string;
  isPaid!: boolean;
  daysTaken!: number;
  @ApiProperty({ nullable: true, type: Number })
  remainingDays!: number | null;
}

export class PayrollReportRowDto {
  @ApiProperty({ example: '2026-09' })
  month!: string;
  status!: string;
  employees!: number;
  totalGross!: string;
  totalDeductions!: string;
  totalNet!: string;
}

export class WorkModeReportRowDto {
  employeeId!: number;
  employeeCode!: string;
  name!: string;
  departmentName!: string;
  @ApiProperty({
    example: 'hybrid (3/week)',
    description: 'Arrangement on the last day covered',
  })
  mode!: string;
  officeDays!: number;
  remoteDays!: number;
  @ApiProperty({
    description: 'Remote on an office day without approval (flag policy)',
  })
  outsideArrangementDays!: number;
  @ApiProperty({
    description:
      'Office days expected (holidays, leave and approved remote work excused)',
  })
  requiredOfficeDays!: number;
  metOfficeDays!: number;
  @ApiProperty({ nullable: true, type: Number, example: 92 })
  compliancePercent!: number | null;
}
