import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AttendancePolicyRepository } from './attendance-policy.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateAttendancePolicyDto } from './dto/attendance-policy.dto.js';
import { DEFAULT_ATTENDANCE_POLICY } from '../attendance/attendance.constants.js';
import {
  activeTimezone,
  localDate,
  setActiveTimezone,
  today,
} from '../attendance/attendance.util.js';
import type { AttendancePolicy } from '../database/schema/attendance-policy.schema.js';

type Rules = Omit<
  AttendancePolicy,
  'id' | 'effectiveFrom' | 'createdBy' | 'createdAt' | 'updatedAt'
>;

/**
 * Effective-dated attendance rules. The policy in force today is cached
 * (and its timezone pushed to today()/localDate()); every instance reloads
 * it each minute and after a change, so scheduled policies start on time.
 */
@Injectable()
export class AttendancePolicyService implements OnModuleInit {
  private readonly logger = new Logger(AttendancePolicyService.name);
  private current: Rules = { ...DEFAULT_ATTENDANCE_POLICY };

  constructor(
    private readonly repository: AttendancePolicyRepository,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    await this.refresh();
  }

  @Interval(60_000)
  async refresh() {
    try {
      const rows = await this.repository.findAll();
      const policy = this.inForceNow(rows);
      this.current = policy ?? { ...DEFAULT_ATTENDANCE_POLICY };
      if (this.current.timezone !== activeTimezone()) {
        this.logger.log(`Timezone is now ${this.current.timezone}`);
        setActiveTimezone(this.current.timezone);
      }
    } catch (err) {
      this.logger.error({ err }, 'Reloading the attendance policy failed');
    }
  }

  /** Rules in force today (cached; at most a minute stale). */
  rules(): Readonly<Rules> {
    return this.current;
  }

  async list() {
    const rows = await this.repository.findAll();
    const current = this.inForceNow(rows);
    return rows.map((r) => this.toResponse(r, r.id === current?.id));
  }

  /** Omitted fields come from the policy in force on effectiveFrom. */
  async create(userId: number, dto: CreateAttendancePolicyDto) {
    const rows = await this.repository.findAll();
    const base =
      this.inForce(rows, dto.effectiveFrom) ?? DEFAULT_ATTENDANCE_POLICY;
    const timezone = dto.timezone ?? base.timezone;
    if (dto.timezone !== undefined) await this.assertTimezone(timezone);

    const row = await this.repository.create({
      effectiveFrom: dto.effectiveFrom,
      timezone,
      workStartTime: dto.workStartTime ?? base.workStartTime.slice(0, 5),
      lateGraceMinutes: dto.lateGraceMinutes ?? base.lateGraceMinutes,
      standardWorkMinutes: dto.standardWorkMinutes ?? base.standardWorkMinutes,
      correctionWindowDays:
        dto.correctionWindowDays ?? base.correctionWindowDays,
      maxShiftHours: dto.maxShiftHours ?? base.maxShiftHours,
      unapprovedRemoteCheckIn:
        dto.unapprovedRemoteCheckIn ?? base.unapprovedRemoteCheckIn,
      officeCheckInVerification:
        dto.officeCheckInVerification ?? base.officeCheckInVerification,
      createdBy: userId,
    });
    if (!row) {
      throw new ConflictException(
        `An attendance policy starting ${dto.effectiveFrom} already exists`,
      );
    }
    await this.audit.record({
      action: 'attendance_policy.created',
      entityType: 'attendance_policy',
      entityId: row.id,
      after: row,
    });
    await this.refresh();
    return (await this.list()).find((p) => p.id === row.id)!;
  }

  /** Only scheduled (future) policies can be removed; history stays. */
  async remove(id: number) {
    const row = await this.repository.findById(id);
    if (!row)
      throw new NotFoundException(`Attendance policy with id ${id} not found`);
    if (row.effectiveFrom <= today()) {
      throw new ConflictException(
        'Only policies that have not started yet can be removed; add a new one instead',
      );
    }
    await this.repository.remove(id);
    await this.audit.record({
      action: 'attendance_policy.deleted',
      entityType: 'attendance_policy',
      entityId: id,
      before: row,
    });
    await this.refresh();
  }

  /** The policy governing `date` (rows are newest first). */
  private inForce(rows: AttendancePolicy[], date: string) {
    return rows.find((r) => r.effectiveFrom <= date);
  }

  /**
   * The policy in force now: the newest one that has started in its own
   * timezone. Judging by the previous policy's "today" instead would
   * flip-flop when a change moves to a timezone that is still on the
   * previous date.
   */
  private inForceNow(rows: AttendancePolicy[]) {
    const now = new Date();
    return rows.find((r) => r.effectiveFrom <= localDate(now, r.timezone));
  }

  private async assertTimezone(name: string) {
    let validInNode = true;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: name });
    } catch {
      validInNode = false;
    }
    if (!validInNode || !(await this.repository.isKnownTimezone(name))) {
      throw new BadRequestException(
        `Unknown timezone "${name}"; use an IANA name such as Asia/Dhaka or Europe/London`,
      );
    }
  }

  private toResponse(row: AttendancePolicy, current: boolean) {
    const [h, m] = row.workStartTime.split(':').map(Number);
    const late = h * 60 + m + row.lateGraceMinutes;
    return {
      id: row.id,
      effectiveFrom: row.effectiveFrom,
      timezone: row.timezone,
      workStartTime: row.workStartTime.slice(0, 5),
      lateGraceMinutes: row.lateGraceMinutes,
      lateAfter: `${String(Math.floor(late / 60) % 24).padStart(2, '0')}:${String(late % 60).padStart(2, '0')}`,
      standardWorkMinutes: row.standardWorkMinutes,
      correctionWindowDays: row.correctionWindowDays,
      maxShiftHours: row.maxShiftHours,
      unapprovedRemoteCheckIn: row.unapprovedRemoteCheckIn,
      officeCheckInVerification: row.officeCheckInVerification,
      current,
    };
  }
}
