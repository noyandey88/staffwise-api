# Admin route prefix — design

Date: 2026-10-05 · Branch: `refactor/admin-routes` · Status: **proposed — awaiting approval**

## Goal

Put back-office endpoints under `/api/admin/...` so the admin console and the employee app have clearly separated APIs, and infrastructure (rate limits, IP allow-lists, logging, separate API docs) can target the back office with one path rule. Do it **before** the role + permission system so that work lands on the final routes, and break client paths only once.

## Rules

1. **`/admin`**: everything that is Admin/HR-only and manages the organisation — configuration, payroll, org-wide lists, other people's records, HR-only decisions (certificates, separations), audit log, company dashboard and reports.
2. **Stays shared**: public endpoints; self-service (`/…/me`, check-in, requests, cancelling your own); reads employees need (holidays, work weeks, leave types, notice feed, directory, org chart, photos); and anything **managers** can use for their reports (approvals, request lists, team dashboard, attendance views, the work-mode report) — those are not admin-only, so moving them would make managers "admin".
3. **One resource, two audiences** is fine: `GET /holidays` (everyone) and `POST /admin/holidays` (management).
4. **Fix verb-style paths in the same break**: `/employees/get/all` → `GET /employees`, `/employees/create` → `POST /admin/employees`, `/employees/update` (id in body) → `PATCH /admin/employees/:id`; same for departments.
5. **Self-service paths keep their shape** (`/leave/me`, `/attendance/me`, …): already consistent; moving them to `/me/...` would be churn without benefit.
6. **The prefix is not the security boundary.** Every route keeps its own `@Auth()`/`@Roles()` (later: permission) check; `/admin` organises, it does not authorise.

## Summary

156 routes: **81 move to `/admin`**, 4 shared routes drop verb-style paths, 71 unchanged. Checked mechanically: no collisions, every Admin/HR-only route ends up under `/admin`, no manager-usable route moves into it.

## Routes that change

| Method | Old path | New path | Who |
|---|---|---|---|
| POST | `/auth/register` | `/admin/users` | Admin, Hr |
| PATCH | `/users/:id/role` | `/admin/users/:id/role` | Admin |
| GET | `/users/get/all` | `/admin/users` | Admin, Hr |
| GET | `/employees/:id/department-history` | `/admin/employees/:id/department-history` | Admin, Hr |
| GET | `/employees/:id/documents` | `/admin/employees/:id/documents` | Admin, Hr |
| POST | `/employees/:id/documents` | `/admin/employees/:id/documents` | Admin, Hr |
| POST | `/employees/create` | `/admin/employees` | Admin, Hr |
| DELETE | `/employees/delete/:id` | `/admin/employees/:id` | Admin |
| GET | `/employees/get/:id` | `/employees/:id` | signed-in |
| GET | `/employees/get/all` | `/employees` | signed-in |
| PATCH | `/employees/update` | `/admin/employees/:id` | Admin, Hr |
| POST | `/departments/create` | `/admin/departments` | Admin, Hr |
| DELETE | `/departments/delete/:id` | `/admin/departments/:id` | Admin |
| GET | `/departments/get/:id` | `/departments/:id` | signed-in |
| GET | `/departments/get/all` | `/departments` | signed-in |
| PATCH | `/departments/update` | `/admin/departments/:id` | Admin, Hr |
| PUT | `/company` | `/admin/company` | Admin |
| DELETE | `/company/logo` | `/admin/company/logo` | Admin |
| PUT | `/company/logo` | `/admin/company/logo` | Admin |
| POST | `/holidays` | `/admin/holidays` | Admin, Hr |
| DELETE | `/holidays/:id` | `/admin/holidays/:id` | Admin, Hr |
| PATCH | `/holidays/:id` | `/admin/holidays/:id` | Admin, Hr |
| POST | `/work-weeks` | `/admin/work-weeks` | Admin |
| DELETE | `/work-weeks/:id` | `/admin/work-weeks/:id` | Admin |
| POST | `/attendance-policies` | `/admin/attendance-policies` | Admin |
| DELETE | `/attendance-policies/:id` | `/admin/attendance-policies/:id` | Admin |
| GET | `/offices` | `/admin/offices` | Admin, Hr |
| POST | `/offices` | `/admin/offices` | Admin |
| PATCH | `/offices/:id` | `/admin/offices/:id` | Admin |
| GET | `/work-arrangements` | `/admin/work-arrangements` | Admin, Hr |
| POST | `/work-arrangements` | `/admin/work-arrangements` | Admin, Hr |
| DELETE | `/work-arrangements/:id` | `/admin/work-arrangements/:id` | Admin, Hr |
| GET | `/attendance/summary` | `/admin/attendance/summary` | Admin, Hr |
| PUT | `/leave/balances` | `/admin/leave/balances` | Admin, Hr |
| POST | `/leave/balances/allocate` | `/admin/leave/balances/allocate` | Admin, Hr |
| GET | `/leave/balances/employee/:employeeId` | `/admin/leave/balances/employee/:employeeId` | Admin, Hr |
| POST | `/leave/types` | `/admin/leave/types` | Admin, Hr |
| PATCH | `/leave/types/:id` | `/admin/leave/types/:id` | Admin, Hr |
| POST | `/notices` | `/admin/notices` | Admin, Hr |
| DELETE | `/notices/:id` | `/admin/notices/:id` | Admin, Hr |
| PATCH | `/notices/:id` | `/admin/notices/:id` | Admin, Hr |
| GET | `/notices/all` | `/admin/notices` | Admin, Hr |
| DELETE | `/payroll/bank-accounts/:id` | `/admin/payroll/bank-accounts/:id` | Admin, Hr |
| PATCH | `/payroll/bank-accounts/:id/primary` | `/admin/payroll/bank-accounts/:id/primary` | Admin, Hr |
| GET | `/payroll/components` | `/admin/payroll/components` | Admin, Hr |
| POST | `/payroll/components` | `/admin/payroll/components` | Admin, Hr |
| PATCH | `/payroll/components/:id` | `/admin/payroll/components/:id` | Admin, Hr |
| DELETE | `/payroll/employee-components/:id` | `/admin/payroll/employee-components/:id` | Admin, Hr |
| PATCH | `/payroll/employee-components/:id` | `/admin/payroll/employee-components/:id` | Admin, Hr |
| GET | `/payroll/employees/:employeeId/bank-accounts` | `/admin/payroll/employees/:employeeId/bank-accounts` | Admin, Hr |
| POST | `/payroll/employees/:employeeId/bank-accounts` | `/admin/payroll/employees/:employeeId/bank-accounts` | Admin, Hr |
| GET | `/payroll/employees/:employeeId/components` | `/admin/payroll/employees/:employeeId/components` | Admin, Hr |
| POST | `/payroll/employees/:employeeId/components` | `/admin/payroll/employees/:employeeId/components` | Admin, Hr |
| GET | `/payroll/employees/:employeeId/salary` | `/admin/payroll/employees/:employeeId/salary` | Admin, Hr |
| POST | `/payroll/employees/:employeeId/salary` | `/admin/payroll/employees/:employeeId/salary` | Admin, Hr |
| PUT | `/payroll/payslips/:id/adjustments` | `/admin/payroll/payslips/:id/adjustments` | Admin, Hr |
| GET | `/payroll/policy` | `/admin/payroll/policy` | Admin, Hr |
| PATCH | `/payroll/policy` | `/admin/payroll/policy` | Admin |
| GET | `/payroll/runs` | `/admin/payroll/runs` | Admin, Hr |
| POST | `/payroll/runs` | `/admin/payroll/runs` | Admin, Hr |
| DELETE | `/payroll/runs/:id` | `/admin/payroll/runs/:id` | Admin, Hr |
| GET | `/payroll/runs/:id` | `/admin/payroll/runs/:id` | Admin, Hr |
| PATCH | `/payroll/runs/:id/approve` | `/admin/payroll/runs/:id/approve` | Admin, Hr |
| GET | `/payroll/runs/:id/bank-file` | `/admin/payroll/runs/:id/bank-file` | Admin, Hr |
| PATCH | `/payroll/runs/:id/mark-paid` | `/admin/payroll/runs/:id/mark-paid` | Admin, Hr |
| GET | `/payroll/runs/:id/payslips` | `/admin/payroll/runs/:id/payslips` | Admin, Hr |
| GET | `/salary-certificates` | `/admin/salary-certificates` | Admin, Hr |
| PATCH | `/salary-certificates/:id/issue` | `/admin/salary-certificates/:id/issue` | Admin, Hr |
| PATCH | `/salary-certificates/:id/reject` | `/admin/salary-certificates/:id/reject` | Admin, Hr |
| POST | `/salary-certificates/issue` | `/admin/salary-certificates` | Admin, Hr |
| GET | `/separations` | `/admin/separations` | Admin, Hr |
| POST | `/separations` | `/admin/separations` | Admin, Hr |
| PATCH | `/separations/:id/approve` | `/admin/separations/:id/approve` | Admin, Hr |
| PATCH | `/separations/:id/reject` | `/admin/separations/:id/reject` | Admin, Hr |
| PUT | `/separations/:id/settlement/adjustments` | `/admin/separations/:id/settlement/adjustments` | Admin, Hr |
| PATCH | `/separations/:id/settlement/finalize` | `/admin/separations/:id/settlement/finalize` | Admin, Hr |
| PATCH | `/separations/:id/settlement/mark-paid` | `/admin/separations/:id/settlement/mark-paid` | Admin, Hr |
| POST | `/separations/:id/settlement/recompute` | `/admin/separations/:id/settlement/recompute` | Admin, Hr |
| PATCH | `/separations/:id/withdraw` | `/admin/separations/:id/withdraw` | Admin, Hr |
| GET | `/audit-logs` | `/admin/audit-logs` | Admin |
| GET | `/dashboard/overview` | `/admin/dashboard` | Admin, Hr |
| GET | `/reports/attendance` | `/admin/reports/attendance` | Admin, Hr |
| GET | `/reports/headcount` | `/admin/reports/headcount` | Admin, Hr |
| GET | `/reports/leave` | `/admin/reports/leave` | Admin, Hr |
| GET | `/reports/payroll` | `/admin/reports/payroll` | Admin, Hr |

## Routes that stay

| Method | Path | Who | Why it stays |
|---|---|---|---|
| GET | `/attendance-policies` | signed-in | employees read it |
| POST | `/attendance/check-in` | signed-in | self-service |
| POST | `/attendance/check-out` | signed-in | self-service |
| GET | `/attendance/corrections` | Admin, Hr, Manager | managers use it, scoped to their reports |
| POST | `/attendance/corrections` | signed-in | self-service |
| PATCH | `/attendance/corrections/:id/approve` | Admin, Hr, Manager | managers use it, scoped to their reports |
| PATCH | `/attendance/corrections/:id/cancel` | signed-in | self-service |
| PATCH | `/attendance/corrections/:id/reject` | Admin, Hr, Manager | managers use it, scoped to their reports |
| GET | `/attendance/corrections/me` | signed-in | self-service |
| GET | `/attendance/employee/:id` | Admin, Hr, Manager | managers use it, scoped to their reports |
| GET | `/attendance/employee/:id/days` | Admin, Hr, Manager | managers use it, scoped to their reports |
| GET | `/attendance/me` | signed-in | self-service |
| GET | `/attendance/me/days` | signed-in | self-service |
| POST | `/auth/access-token/refresh` | public | public |
| POST | `/auth/login` | public | public |
| POST | `/auth/logout` | signed-in | self-service |
| PATCH | `/auth/password` | signed-in | self-service |
| POST | `/auth/password/forgot` | public | public |
| POST | `/auth/password/reset` | public | public |
| GET | `/company` | signed-in | employees read it |
| GET | `/company/branding` | public | public |
| GET | `/company/logo` | public | public |
| GET | `/dashboard/team` | Manager, Admin, Hr | managers use it, scoped to their reports |
| DELETE | `/documents/:id` | signed-in | the owner, or Admin/HR |
| GET | `/documents/:id/download` | signed-in | the owner, or Admin/HR |
| GET | `/employees/:id/managers` | signed-in | employees read it |
| GET | `/employees/:id/photo` | signed-in | employees read it |
| GET | `/employees/:id/profile` | signed-in | the employee, their managers, or Admin/HR |
| GET | `/employees/:id/reports` | signed-in | employees read it |
| GET | `/employees/:id/work-arrangement` | signed-in | the employee, their managers, or Admin/HR |
| GET | `/employees/birthdays/upcoming` | signed-in | employees read it |
| GET | `/employees/me/documents` | signed-in | self-service |
| POST | `/employees/me/documents` | signed-in | self-service |
| GET | `/employees/me/profile` | signed-in | self-service |
| PATCH | `/employees/me/profile` | signed-in | self-service |
| GET | `/employees/me/work-arrangement` | signed-in | self-service |
| GET | `/employees/org-chart` | signed-in | employees read it |
| GET | `/health` | public | public |
| GET | `/holidays` | signed-in | employees read it |
| PATCH | `/leave/:id/approve` | Admin, Hr, Manager | managers use it, scoped to their reports |
| PATCH | `/leave/:id/cancel` | signed-in | self-service |
| PATCH | `/leave/:id/reject` | Admin, Hr, Manager | managers use it, scoped to their reports |
| GET | `/leave/balances/me` | signed-in | self-service |
| GET | `/leave/me` | signed-in | self-service |
| GET | `/leave/pending` | Admin, Hr, Manager | managers use it, scoped to their reports |
| POST | `/leave/request` | signed-in | self-service |
| GET | `/leave/requests` | Admin, Hr, Manager | managers use it, scoped to their reports |
| GET | `/leave/types` | signed-in | employees read it |
| GET | `/notices` | signed-in | employees read it |
| GET | `/notices/:id` | signed-in | employees read it |
| GET | `/payroll/bank-accounts/me` | signed-in | self-service |
| GET | `/payroll/payslips/:id/pdf` | signed-in | the owner, or Admin/HR |
| GET | `/payroll/payslips/me` | signed-in | self-service |
| GET | `/payroll/salary/me` | signed-in | self-service |
| GET | `/remote-work/requests` | Admin, Hr, Manager | managers use it, scoped to their reports |
| POST | `/remote-work/requests` | signed-in | self-service |
| PATCH | `/remote-work/requests/:id/approve` | Admin, Hr, Manager | managers use it, scoped to their reports |
| PATCH | `/remote-work/requests/:id/cancel` | signed-in | self-service |
| PATCH | `/remote-work/requests/:id/reject` | Admin, Hr, Manager | managers use it, scoped to their reports |
| GET | `/remote-work/requests/me` | signed-in | self-service |
| GET | `/reports/work-modes` | Admin, Hr, Manager | managers use it, scoped to their reports |
| PATCH | `/salary-certificates/:id/cancel` | signed-in | self-service |
| GET | `/salary-certificates/:id/pdf` | signed-in | the owner, or Admin/HR |
| GET | `/salary-certificates/me` | signed-in | self-service |
| POST | `/salary-certificates/request` | signed-in | self-service |
| PATCH | `/separations/:id/cancel` | signed-in | self-service |
| GET | `/separations/:id/settlement` | signed-in | the owner, or Admin/HR |
| GET | `/separations/me` | signed-in | self-service |
| POST | `/separations/resign` | signed-in | self-service |
| GET | `/users/me` | signed-in | self-service |
| GET | `/work-weeks` | signed-in | employees read it |

## Implementation

- **Admin controllers per module**, e.g. `LeaveAdminController` with `@Controller('admin/leave')`, holding the handlers that move; shared controllers keep the rest. Handlers move with their decorators unchanged (`@Roles`, `@ApiEnvelope`, …), so the permission work later touches each handler once. Mixed controllers that split: leave, employees, departments, company, calendar (holidays/work weeks), attendance-policy, attendance (summary), notices, payroll (bank accounts, salary), certificates, separations, reports, users/auth (register).
- **Path params instead of body ids** for `PATCH /admin/employees/:id` and `PATCH /admin/departments/:id` (`UpdateEmployeeDto`/`UpdateDepartmentDto` lose `id`).
- **Two Swagger documents**: `/docs` (app) and `/docs/admin` (admin), split by path prefix from one generated document; `/api` keeps serving the full spec.
- **Throttling/logging unchanged** for now; the prefix makes per-area rules a one-liner later.
- **No redirects or aliases** for old paths: clients switch once, using the table above (also put in the PR description).
- Tests: route inventory diffed against this map; end-to-end smoke of one route per moved area plus every changed path's auth/role behaviour.

## Out of scope

- Permission system (next, by the maintainer).
- `/me/...` consolidation of self-service routes.
- API versioning (`/v1`).
