import type { Routes } from '@nestjs/core';
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
import { OfficeModule } from '../office/office.module.js';
import { PayrollPolicyModule } from '../payroll/payroll-policy.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AdminModule } from './admin.module.js';

/**
 * Nested routes: every controller of these modules is served under
 * /api/admin. Controllers declare only their area (`@Controller('leave')`),
 * so `@Post('types')` there is `POST /api/admin/leave/types`. The prefix
 * organises routes; each handler still carries its own @Auth()/@Roles().
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: 'admin',
    module: AdminModule,
    children: [
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
      OfficeModule,
      PayrollPolicyModule,
      AuditModule,
    ],
  },
];
