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
```

There are no automated tests (removed deliberately); verify changes with `pnpm typecheck`, `pnpm lint:check` and `pnpm build`.

Config is zod-validated at boot (`src/config/env.validation.ts`,
`validateEnv`) — `DATABASE_URL`, `JWT_SECRET`, `THROTTLE_TTL`, and
`THROTTLE_LIMIT` are required; everything else has schema defaults; the
app fails fast with a descriptive error. Both Nest and Drizzle load the
root `.env` through `src/config/env-files.ts`; injected process variables
override values from that file. Token lifetimes are in **seconds**.

## Architecture

Standard NestJS module-per-feature layout (`auth`, `user`, `employees`, `department`, `attendance`, `health`), each following **controller → service → repository**. Repositories are the only layer that touches the database.

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
- Login answers unknown email and wrong password with the same 401. Register enforces password length 8–72 and normalizes email (trim + lower-case) on both register and login.

### HR domain

- Roles (`UserRole` in `src/user/user.types.ts`, which also drives the `user_role` pg enum): `super_admin`, `admin`, `hr`, `manager`, `employee` (default on register). Admin/HR manage employees and departments. Admins change roles (`PATCH /users/:id/role`, never their own; only `ASSIGNABLE_ROLES`). `super_admin` is created by `SuperAdminSeeder` (`OnApplicationBootstrap`, `src/user/super-admin.seeder.ts`) from `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` only when none exists; it passes every `RolesGuard` check, skips `assertCanSignIn`, and cannot be assigned or have its role changed. Hardcoded role comparisons (e.g. `AttendanceService.assertCanView`) must include `SuperAdmin`. The role lives in the JWT, so a change takes effect on the user's next login/refresh.
- `employees` is 1:1 with `users` (`user_id` unique) and belongs to a department; `manager_id` self-references to form the org tree. `EmployeesRepository.findReports` walks it recursively, so a manager's "reports" include indirect reports.
- Endpoints act on the caller via the JWT `sub` (a **user** id), resolved to an employee with `EmployeesService.findByUserId` (404 if the user has no employee record). Path params like `/attendance/employee/:id` are **employee** ids.
- Attendance: one `attendance_records` row per employee per `work_date` (unique constraint; check-in uses `onConflictDoNothing` and maps an empty return to 409). `work_date` is a `YYYY-MM-DD` string computed in `ATTENDANCE_TIMEZONE` (`Asia/Dhaka`) by `attendance.util.ts`; month filters are half-open ranges from `monthRange()`. Lateness (`LATE_AFTER`), worked and overtime minutes (`STANDARD_WORK_MINUTES`) are computed in SQL at read time, not stored.
- Accounts: `POST /auth/register` is admin/HR-only (no public signup); `PATCH /auth/password` revokes all refresh tokens. `UserService.assertCanSignIn` blocks login/refresh for `SIGN_IN_BLOCKED_STATUSES` (terminated/resigned/retired, in `employees.enum.ts`); a blocked refresh revokes all the user's tokens. Only `active` employees check in/out. `GET /users/me` joins the employee + department (`UserRepository.findProfile`).
- Attendance visibility: Admin/HR see anyone; managers see themselves plus their (recursive) reports — enforced in `AttendanceService.assertCanView`, not by `@Roles` alone.

### Observability (`@nestjs/observe`)

`createObserveModule` in `app.module.ts` is configured with `skipInstrumentation` for `pg.Pool` — observe proxies every function-valued property of every provider, and pg-pool calls `new this.Promise(...)`, so instrumenting the pool breaks every query. `ObserveModule` and the `instrument` option are only enabled when both `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` are set (`observeEnabled`).

### Health, rate limiting, logging

- `HealthModule` (`src/health/`) exposes `GET /health` via `@nestjs/terminus`, checking `DrizzleHealthIndicator` (runs `SELECT 1` through the injected `DRIZZLE_ORM` instance).
- `ThrottlerGuard` is registered globally as `APP_GUARD` in `app.module.ts` (limits from `THROTTLE_TTL`/`THROTTLE_LIMIT`, converted to ms). Endpoints that must not be rate-limited (e.g. `/health`) need `@SkipThrottle()` from `@nestjs/throttler`.
- Logging goes through `nestjs-pino` (`LoggerModule.forRootAsync` in `app.module.ts`, `app.useLogger(app.get(Logger))` in `bootstrap.ts`); `Authorization`/`Cookie` headers are redacted. **Never use `console.log`** — inject `Logger`/`PinoLogger` or use Nest's standard logger, which pino now backs.

### Response envelope (cross-cutting)

`createApp()` in `src/bootstrap.ts` builds the whole app — observe instrumentation, pino logger, helmet, CORS, a `ValidationPipe` (`whitelist` + `transform`, so DTOs use class-validator decorators and unknown fields are stripped), `ResponseInterceptor`, `AllExceptionsFilter`, and Swagger. `main.ts` only calls it and listens. **Add global wiring to `createApp()`, never to `main.ts`.** `AllExceptionsFilter` never sends an unexpected `Error`'s message to the client (log only). Every response — success or error — is normalized to the `ApiResponse` shape `{ success, status, message, payload }` (`src/common/`). Controllers return the **raw payload** (usually the service result); the interceptor builds the envelope, deriving `status` from the response's HTTP status code and `message` from `@ApiEnvelope` route metadata.

Per-route contract lives in composed decorators (`src/common/decorators/`):

- `@ApiEnvelope(PayloadDto, { message })` — sets the HTTP code (default 200), the envelope message, and the Swagger success schema (envelope + payload DTO). Use `null` for null payloads, `isArray: true` for lists.
- `@Auth()` — `AuthGuard` + `RolesGuard` + Swagger bearer (`access-token`) + documented 401. Class-level when every route is protected.
- `@Roles(...UserRole)` — restricts an `@Auth()` route to those roles and documents the 403.
- `@ApiErrorResponses(HttpStatus.X, ...)` — documents error codes with the `ErrorResponseDto` shape emitted by `AllExceptionsFilter`.
- `@CurrentUser('sub' | 'email' | 'role')` — injects the verified JWT payload (or one field) from `request.user`.

Do not add `@ApiBody` (inferred from `@Body()` types) or per-route `@HttpCode`/`@UseGuards`/`@ApiBearerAuth` — the decorators above own those.

### Conventions

- The project is native ESM (`"type": "module"`, `module: nodenext`). Every relative import must carry an explicit `.js` extension (`./foo.js`, `../bar/index.js`), even though the source is `.ts`; tsc rejects extensionless imports. There is no `src/*` alias.
- Swagger: tag controllers with `@ApiTags`, document endpoints with `@ApiOperation`.
- Design specs/plans for past infrastructure changes live in `docs/superpowers/{specs,plans}/`.
- `.github/workflows/ci.yml` is currently fully commented out; run `lint:check`, `typecheck`, `build` locally as the gate.
