import { Module } from '@nestjs/common';
import { UsersAdminModule } from '../user/users-admin.module.js';
import { EmployeesAdminModule } from '../employees/employees-admin.module.js';
import { DocumentAdminModule } from '../document/document-admin.module.js';
import { DepartmentAdminModule } from '../department/department-admin.module.js';
import { CompanyAdminModule } from '../company/company-admin.module.js';
import { CalendarAdminModule } from '../calendar/calendar-admin.module.js';
import { AttendancePolicyAdminModule } from '../attendance-policy/attendance-policy-admin.module.js';
import { WorkModeAdminModule } from '../work-mode/work-mode-admin.module.js';
import { AttendanceAdminModule } from '../attendance/attendance-admin.module.js';
import { LeaveAdminModule } from '../leave/leave-admin.module.js';
import { NoticeAdminModule } from '../notice/notice-admin.module.js';
import { PayrollAdminModule } from '../payroll/payroll-admin.module.js';
import { SalaryCertificateAdminModule } from '../certificate/salary-certificate-admin.module.js';
import { SeparationAdminModule } from '../separation/separation-admin.module.js';
import { ReportAdminModule } from '../report/report-admin.module.js';

/**
 * Root of the back office (see admin.routes.ts). Feature modules whose only
 * controller is admin (offices, payroll policy, audit log) are mounted there
 * directly; the others contribute a small *AdminModule.
 */
@Module({
  imports: [
    UsersAdminModule,
    EmployeesAdminModule,
    DocumentAdminModule,
    DepartmentAdminModule,
    CompanyAdminModule,
    CalendarAdminModule,
    AttendancePolicyAdminModule,
    WorkModeAdminModule,
    AttendanceAdminModule,
    LeaveAdminModule,
    NoticeAdminModule,
    PayrollAdminModule,
    SalaryCertificateAdminModule,
    SeparationAdminModule,
    ReportAdminModule,
  ],
})
export class AdminModule {}
