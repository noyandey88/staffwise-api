# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Staffwise — a NestJS 12 HR API (employees, departments, attendance) built on an in-house starter template (the package name is still `nestjs-lms`, and `README.md` still describes the starter and its since-removed `course` demo module). Uses Drizzle ORM on PostgreSQL, JWT auth with refresh tokens, and Swagger docs served at `/api`. Package manager is **pnpm**. Requires Node 24.9+ (pinned in .nvmrc, package.json engines, CI, and the Dockerfile); the project is native ESM.

## Commands

```bash
pnpm start:dev          # run with watch mode (default port 3000, override with PORT)
pnpm build              # nest build
pnpm lint               # eslint with --fix (prettier runs as a lint rule)
pnpm lint:check         # CI gate: eslint without --fix, --max-warnings=0
pnpm typecheck          # tsc --noEmit
pnpm format             # prettier on src/

pnpm db:generate        # generate a Drizzle migration from schema changes
pnpm db:migrate         # apply migrations
pnpm db:push            # push schema directly (no migration file)
pnpm db:studio          # Drizzle Studio UI

docker compose up -d postgres   # local DB; credentials/db name from POSTGRES_* in .env (must match DATABASE_URL)
docker compose up -d mailpit    # local SMTP catcher (SMTP :1025, inbox UI http://localhost:8025)
```

There are no automated tests (removed deliberately); verify changes with `pnpm typecheck`, `pnpm lint:check` and `pnpm build`.

Config is zod-validated at boot (`src/config/env.validation.ts`,
`validateEnv`) — `DATABASE_URL`, `JWT_SECRET`, `THROTTLE_TTL`, and
`THROTTLE_LIMIT` are required; everything else has schema defaults; the
app fails fast with a descriptive error. Both Nest and Drizzle load the
root `.env` through `src/config/env-files.ts`; injected process variables
override values from that file. Token lifetimes are in **seconds**.

## Architecture

Standard NestJS module-per-feature layout (`auth`, `user`, `employees`, `department`, `attendance`, `leave`, `payroll`, `company`, `notice`, `calendar`, `health`), each following **controller → service → repository**. Repositories are the only layer that touches the database.

### Database (Drizzle)

- `src/database/database.module.ts` is a `@Global()` module providing a Drizzle instance via the `DRIZZLE_ORM` injection token and a `pg.Pool` via the `PG_POOL` token (`src/database/database.constants.ts`). Repositories inject Drizzle as `@Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>`.
- `DatabaseLifecycle` (`src/database/database.provider.ts`) implements `OnApplicationShutdown` and calls `pool.end()` on shutdown; `createApp()` calls `app.enableShutdownHooks()` so the pool closes cleanly on SIGTERM/SIGINT. The pool is bounded by `DB_POOL_MAX`, `DB_CONNECT_TIMEOUT_MS` and `DB_STATEMENT_TIMEOUT_MS` (defaults in `env.validation.ts`).
- Table definitions live in `src/database/schema/*.schema.ts` and must be re-exported from `src/database/schema/index.ts` — both the Drizzle query API (`db.query.<table>`) and drizzle-kit discover tables through that barrel/glob.
- Migrations are generated into `drizzle/migrations/`. Workflow for a schema change: edit schema file → `pnpm db:generate` → `pnpm db:migrate`.
- Row types: the HR schema files export `$inferSelect`/`$inferInsert` types next to the table (`Employee`, `NewDepartment`, …); older code derives them per-repository with `InferSelectModel`. No shared entity classes.
- Non-trivial queries are raw SQL via `db.execute(sql\`...\`)` returning `result.rows` (recursive CTE for the reporting chain, window-function monthly summary). Those rows are not typed by Drizzle and use snake_case unless aliased.

### Auth

- `AuthModule` registers `JwtModule` as **global** via `registerAsync`, reading `JWT_SECRET` and `JWT_ACCESS_EXPIRES_IN` (seconds) from `ConfigService`; refresh tokens are persisted via `auth/refresh-token.repository.ts` (`refresh_tokens` table, SHA-256 digest of the raw token, unique-indexed) and their lifetime is `JWT_REFRESH_EXPIRES_IN` (seconds). `POST /auth/access-token/refresh` is public: it redeems a refresh token for a new access/refresh pair, revokes the presented one, and treats a second presentation as reuse (revokes every token for that user). Login sheds the user's revoked/expired rows.
- Protect routes with `@Auth()` (`src/common/decorators/auth.decorator.ts`), which bundles `AuthGuard` + `RolesGuard`, the `access-token` Swagger bearer scheme, and the documented 401; the guard puts the JWT payload on `request.user`, accessed via `@CurrentUser()`. Restrict by role with `@Roles(UserRole.Admin)` (`roles.decorator.ts`), which `RolesGuard` enforces and which documents the 403.
- Password links (`password_reset_tokens`, SHA-256 digest, one row per user, single use via an atomic `consume`): `POST /auth/password/forgot` (public, same response whether or not the email exists, 60 s per-user cooldown, no link for former staff) and new accounts (`purpose: setup`, `ACCOUNT_SETUP_EXPIRES_IN`) email `WEB_APP_URL/reset-password?token=…`; `POST /auth/password/reset` redeems it and revokes all refresh tokens. Register's `password` is optional (without it the account is unusable until the link is used).
- Login answers unknown email and wrong password with the same 401. Register enforces password length 8–72 and normalizes email (trim + lower-case) on both register and login.

### HR domain

- Roles (`UserRole` in `src/user/user.types.ts`, which also drives the `user_role` pg enum): `super_admin`, `admin`, `hr`, `manager`, `employee` (default on register). Admin/HR manage employees and departments. Admins change roles (`PATCH /users/:id/role`, never their own; only `ASSIGNABLE_ROLES`). `super_admin` is created by `SuperAdminSeeder` (`OnApplicationBootstrap`, `src/user/super-admin.seeder.ts`) from `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` only when none exists; it passes every `RolesGuard` check, skips `assertCanSignIn`, and cannot be assigned or have its role changed. Hardcoded role comparisons (e.g. `AttendanceService.assertCanView`) must include `SuperAdmin`. The role lives in the JWT, so a change takes effect on the user's next login/refresh.
- `employees` is 1:1 with `users` (`user_id` unique) and belongs to a department; `manager_id` self-references to form the org tree. `EmployeesRepository.findReports` walks it recursively, so a manager's "reports" include indirect reports. `assertValidManager` rejects self-management, unknown managers and cycles (a cycle would make the recursive CTE loop until the statement timeout). Org views use directory fields only: `GET /employees/org-chart` (current staff as a nested tree; someone whose manager left becomes a root), `/employees/:id/reports` (`all=true` for the subtree) and `/employees/:id/managers` (chain to the top).
- Employee profile: `employee_code` defaults to `EMP-NNNNN` from `employee_code_seq` (HR may set its own, but not `EMP-<number>`, which is reserved; unique), plus employment type, probation/contract end dates and personal details (DOB, gender, blood group, national ID (unique), phone, addresses, one emergency contact). **Privacy split:** `/employees/get/all` and `/get/:id` return `EmployeeDirectoryDto` (directory columns only, `directoryColumns` in the repository) to any signed-in user; full profiles come from `/employees/:id/profile` (Admin/HR any, self, managers their recursive reports) and `/employees/me/profile`. Employees edit only `EmployeeContactDto` fields via `PATCH /employees/me/profile`; the rest is HR's (`PATCH /employees/update`). Never add personal columns to `directoryColumns`.
- Endpoints act on the caller via the JWT `sub` (a **user** id), resolved to an employee with `EmployeesService.findByUserId` (404 if the user has no employee record). Path params like `/attendance/employee/:id` are **employee** ids.
- Attendance: one `attendance_records` row per employee per `work_date` (unique constraint; check-in uses `onConflictDoNothing` and maps an empty return to 409). `work_date` is a `YYYY-MM-DD` string computed in `ATTENDANCE_TIMEZONE` (`Asia/Dhaka`) by `attendance.util.ts`; month filters are half-open ranges from `monthRange()`. Lateness (`LATE_AFTER`), worked and overtime minutes (`STANDARD_WORK_MINUTES`) are computed in SQL at read time, not stored.
- Accounts: `POST /auth/register` is admin/HR-only (no public signup); `PATCH /auth/password` revokes all refresh tokens. `UserService.assertCanSignIn` blocks login/refresh for `SIGN_IN_BLOCKED_STATUSES` (terminated/resigned/retired, in `employees.enum.ts`); a blocked refresh revokes all the user's tokens. Only `active` employees check in/out. `GET /users/me` joins the employee + department (`UserRepository.findProfile`).
- Attendance corrections (`attendance_corrections`): an employee asks to set a day's check-in and/or check-out (null = keep the recorded time) for today or the last `CORRECTION_WINDOW_DAYS`; check-in must fall on `work_date` in `ATTENDANCE_TIMEZONE`, shifts are capped at `MAX_SHIFT_HOURS`, and a day without a record needs a check-in. One pending request per employee/day (partial unique index). Approval (Admin/HR any, managers their reports, **nobody their own**) re-validates the merged times and upserts `attendance_records` in one transaction; the request row is the audit trail.
- Daily status (`GET /attendance/me/days`, `/attendance/employee/:id/days`): one row per day, derived in SQL at read time — a record wins (present/late, even on a weekend/holiday), else not_employed (before `hired_at`), holiday, weekend, leave (approved), upcoming (today onward), else absent. Absence is never stored.
- Attendance visibility: Admin/HR see anyone; managers see themselves plus their (recursive) reports — enforced in `AttendanceService.assertCanView`, not by `@Roles` alone.
- Calendar (`src/calendar/`, routes under `/holidays`): working days = not a weekend day and not a `holidays` row. Weekend days are `company_profile.weekend_days` (Postgres `dow`, 0 = Sunday; default Fri+Sat via `DEFAULT_WEEKEND_DAYS` when no profile exists). Use `CalendarService.workingDays()`, or `notWeekend()` from `calendar.repository.ts` inside raw SQL (payroll does).
- Leave: Admin/HR manage `leave_types` and balances (`POST /leave/balances/allocate` grants each **paid** type's `default_days_per_year`, skipping existing rows; `PUT /leave/balances` sets one). One balance per (employee, type, year). A request's `days` is working days; it can't span two years or be all non-working days, and paid leave needs enough balance at request time and again at approval (which deducts it). Unpaid types have no balance; payroll deducts their working days in the month at `base_pay / 30` per day. Pending/approved requests can't overlap (`leave_requests_no_overlap` exclusion constraint, btree_gist). Employees cancel their own pending requests; nobody reviews their own (Admin/HR included); `reviewed_by` is a **user** id.
- Notices (`src/notice/`): `department_id` null = company-wide; `published_at` in the future schedules, `expires_at` (exclusive) retires. `GET /notices` is the live feed — `NOTICE_MANAGER_ROLES` (super admin/admin/HR) see every department, everyone else company-wide + their own department (via their employee record). Non-managers get 404, not 403, for notices outside their feed. `GET /notices/all` (Admin/HR) includes scheduled and expired ones.
- Birthdays: `employees.date_of_birth` is optional. `GET /employees/birthdays/upcoming?days=N` (default 30, max 366, any authenticated user) is raw SQL relative to `today()` in `ATTENDANCE_TIMEZONE`; it skips `SIGN_IN_BLOCKED_STATUSES`, celebrates Feb 29 on Feb 28 in non-leap years, and never returns the birth year.

### Health, rate limiting, logging

- `HealthModule` (`src/health/`) exposes `GET /health` via `@nestjs/terminus`, checking `DrizzleHealthIndicator` (runs `SELECT 1` through the injected `DRIZZLE_ORM` instance).
- `ThrottlerGuard` is registered globally as `APP_GUARD` in `app.module.ts` (limits from `THROTTLE_TTL`/`THROTTLE_LIMIT`, converted to ms). Endpoints that must not be rate-limited (e.g. `/health`) need `@SkipThrottle()` from `@nestjs/throttler`.
- Logging goes through `nestjs-pino` (`LoggerModule.forRootAsync` in `app.module.ts`, `app.useLogger(app.get(Logger))` in `bootstrap.ts`); `Authorization`/`Cookie` headers are redacted. **Never use `console.log`** — inject `Logger`/`PinoLogger` or use Nest's standard logger, which pino now backs.

### Documents (PDF)

- `src/common/pdf/`: `renderPdf()` builds an A4 PDF in memory with pdfkit (built-in Helvetica, so Latin text only); `letterhead()`, `details()`, `amountTable()`, `paragraph()` give every document the company letterhead and layout. `money.util.ts` formats amounts (lakh/crore grouping and words for BDT/INR) — amounts stay decimal strings, never floats.
- PDFs are returned as `StreamableFile` (passed through the envelope unwrapped), documented with `@ApiProduces` + `@ApiOkResponse` binary schema. Unauthorized viewers get 404, not 403.
- Payroll runs: `GET /payroll/runs` (paginated, `status`/`year`) and `/runs/:id` include payslip totals; `DELETE /payroll/runs/:id` removes a **draft** run so it can be regenerated.
- Payslip PDF: `GET /payroll/payslips/:id/pdf` (Admin/HR any; employees their own once the run is approved/paid).
- Salary certificates (`src/certificate/`, `salary_certificates`): employee requests (one open at a time) → Admin/HR issue or reject; HR can also issue directly; nobody issues their own. Issuing requires a company profile, a current employee and a salary in effect today, and freezes everything printed into `snapshot` (jsonb) with a `SC-<year>-NNNN` reference from `salary_certificate_ref_seq`, so re-downloads never change. Signature block uses `company_profile.signatory_name/title`.

### Email

- `MailModule` (`src/mail/`, `@Global()`): `MailService` wraps nodemailer (`MAIL_TRANSPORT=smtp` with `SMTP_*`/`MAIL_FROM`; the default `log` only logs, with bodies omitted in production). Templates in `mail.templates.ts` share one layout (plain text + escaped inline-styled HTML), branded from the company profile.
- Inject `NotificationService` for domain emails. Event methods (`leaveSubmitted` → direct manager, `leaveDecided`, `correctionDecided`, `payslipsReleased` on run approval, `accountCreated`) are fire-and-forget: call them **after** the write succeeds and don't await; failures are logged, never thrown. Only `sendPasswordReset` is awaited.

### Response envelope (cross-cutting)

`createApp()` in `src/bootstrap.ts` builds the whole app — pino logger, helmet, CORS, a `ValidationPipe` (`whitelist` + `transform`, so DTOs use class-validator decorators and unknown fields are stripped), `ResponseInterceptor`, `AllExceptionsFilter`, and Swagger. `main.ts` only calls it and listens. **Add global wiring to `createApp()`, never to `main.ts`.** `AllExceptionsFilter` never sends an unexpected `Error`'s message to the client (log only). Every response — success or error — is normalized to the `ApiResponse` shape `{ success, status, message, payload }` (`src/common/`). Controllers return the **raw payload** (usually the service result); the interceptor builds the envelope, deriving `status` from the response's HTTP status code and `message` from `@ApiEnvelope` route metadata.

Per-route contract lives in composed decorators (`src/common/decorators/`):

- `@ApiEnvelope(PayloadDto, { message })` — sets the HTTP code (default 200), the envelope message, and the Swagger success schema (envelope + payload DTO). Use `null` for null payloads, `isArray: true` for lists, `paginated: true` for paginated lists.
- `@Auth()` — `AuthGuard` + `RolesGuard` + Swagger bearer (`access-token`) + documented 401. Class-level when every route is protected.
- `@Roles(...UserRole)` — restricts an `@Auth()` route to those roles and documents the 403.
- `@ApiErrorResponses(HttpStatus.X, ...)` — documents error codes with the `ErrorResponseDto` shape emitted by `AllExceptionsFilter`.
- `@CurrentUser('sub' | 'email' | 'role')` — injects the verified JWT payload (or one field) from `request.user`.

Do not add `@ApiBody` (inferred from `@Body()` types) or per-route `@HttpCode`/`@UseGuards`/`@ApiBearerAuth` — the decorators above own those.

### Conventions

- The project is native ESM (`"type": "module"`, `module: nodenext`). Every relative import must carry an explicit `.js` extension (`./foo.js`, `../bar/index.js`), even though the source is `.ts`; tsc rejects extensionless imports. There is no `src/*` alias.
- Swagger: tag controllers with `@ApiTags`, document endpoints with `@ApiOperation`.
- Design specs/plans for past infrastructure changes live in `docs/superpowers/{specs,plans}/`.
- Paginated lists (`/employees/get/all`, `/users/get/all`, `/leave/requests`, `/attendance/corrections`, `/notices/all`) take a query DTO extending `PaginationQueryDto` (`page`, `limit` ≤ 100, default 20) and return `Paginated<T>` = `{ items, page, limit, total, totalPages }` built with `pageWindow()`/`paginated()` (`src/common/utils/pagination.util.ts`); repositories return `{ items, total }`. Free-text search uses `ilike` with `likePattern()` so `%`/`_` match literally. Small per-caller lists (`/me` endpoints, the notice feed) stay plain arrays.
- Date-only inputs (`YYYY-MM-DD`) use `@IsDateOnly()` (`src/common/decorators/is-date-only.decorator.ts`), which also rejects impossible dates like Feb 31. Drizzle wraps driver errors, so match Postgres codes with `isPgError(err, PG_…)` (`src/common/utils/pg-error.util.ts`), never `err.code` directly.
- `.github/workflows/ci.yml` is currently fully commented out; run `lint:check`, `typecheck`, `build` locally as the gate.
- Dependency pins that look outdated on purpose: `typescript` stays on 6.x until typescript-eslint supports 7 (its peer range is `<6.1.0`), `@types/node` tracks the runtime major (24), and `drizzle-orm` is pinned exactly. `pnpm.onlyBuiltDependencies` allows only `bcrypt` (ships glibc/musl prebuilds; the script just selects one) and `esbuild` (its postinstall validates the platform binary) to run install scripts; `@scarf/scarf` (download telemetry pulled in by swagger-ui-dist) is deliberately ignored. The Dockerfile installs pnpm explicitly (`PNPM_VERSION` build arg) instead of Corepack, which newer Node releases no longer bundle; keep it in sync with `packageManager`.
