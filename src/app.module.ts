import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { DatabaseModule } from './database/database.module.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';
import { validateEnv } from './config/env.validation.js';
import { resolveEnvFiles } from './config/env-files.js';
import { createLoggerOptions } from './config/logger.config.js';
import { EmployeesModule } from './employees/employees.module.js';
import { DepartmentModule } from './department/department.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { LeaveModule } from './leave/leave.module.js';
import { PayrollModule } from './payroll/payroll.module.js';
import { CompanyModule } from './company/company.module.js';
import { NoticeModule } from './notice/notice.module.js';
import { CalendarModule } from './calendar/calendar.module.js';
import { MailModule } from './mail/mail.module.js';
import { SalaryCertificateModule } from './certificate/salary-certificate.module.js';
import { AuditModule } from './audit/audit.module.js';
import { SeparationModule } from './separation/separation.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { StorageModule } from './storage/storage.module.js';
import { DocumentModule } from './document/document.module.js';
import { ReportModule } from './report/report.module.js';
import { AttendancePolicyModule } from './attendance-policy/attendance-policy.module.js';
import { WorkModeModule } from './work-mode/work-mode.module.js';
import { OfficeModule } from './office/office.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: resolveEnvFiles(),
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      providers: [ConfigService],
      inject: [ConfigService],
      useFactory: createLoggerOptions,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL')! * 1000, // throttler expects ms
            limit: config.get<number>('THROTTLE_LIMIT')!,
          },
        ],
      }),
    }),
    AuthModule,
    UserModule,
    DatabaseModule,
    HealthModule,
    EmployeesModule,
    DepartmentModule,
    AttendanceModule,
    LeaveModule,
    PayrollModule,
    CompanyModule,
    NoticeModule,
    CalendarModule,
    MailModule,
    SalaryCertificateModule,
    AuditModule,
    ScheduleModule.forRoot(),
    SeparationModule,
    StorageModule,
    DocumentModule,
    ReportModule,
    AttendancePolicyModule,
    WorkModeModule,
    OfficeModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  controllers: [],
})
export class AppModule {}
