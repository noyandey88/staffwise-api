# Staffwise API

HR management API built with NestJS 12, Drizzle ORM (PostgreSQL) and JWT authentication. It manages users, employees, departments and daily attendance, with role-based access for admins, HR, managers and employees.

## Features

- **Employees**: an employee record per user, linked to a department and an optional manager (an org tree, so managers see their direct and indirect reports)
- **Departments**: create, list, update, delete
- **Attendance**: once-a-day check-in/check-out, monthly history, lateness and overtime computed per day, and a ranked monthly summary
- **Roles**: `super_admin` (seeded once), `admin`, `hr`, `manager`, `employee`, enforced with `@Roles()`
- **Auth**: admin/HR-created accounts, login, password change, short-lived JWT access tokens, rotating single-use refresh tokens with reuse detection, logout-everywhere
- **Consistent responses**: every endpoint returns `{ success, status, message, payload }`
- **Operations**: validated config (boot fails fast), helmet, CORS, rate limiting (stricter on auth), pino logs with secrets redacted, `GET /api/health`, graceful shutdown
- **Swagger**: interactive docs at `/api` and `/docs`

## Quickstart

```bash
nvm use                       # Node 24.9+ required (see .nvmrc)
pnpm install
cp .env.example .env          # then set DATABASE_URL, JWT_SECRET, THROTTLE_TTL, THROTTLE_LIMIT,
                              # and SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD
docker compose up -d postgres # creates the database from POSTGRES_* in .env
pnpm db:migrate
pnpm start:dev                # seeds the super admin on first start; http://localhost:3000/api/...
```

Set `SWAGGER_ENABLED=true` to serve Swagger UI at `http://localhost:3000/api` (also `/docs`, JSON at `/docs-json`).

### Super admin and roles

On startup the app creates a `super_admin` from `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`, **only if no super admin exists yet**:

- The env password is used once, at creation. Changing it in `.env` later has no effect; change it with `PATCH /api/auth/password` after the first login.
- Changing `SUPER_ADMIN_EMAIL` later does not create a second super admin.
- If the email already belongs to another user, nothing is seeded (the user is never promoted) and a warning is logged.
- If the variables are unset and no super admin exists, a warning is logged and the app starts anyway.

The super admin passes every role check, is never blocked by employee status, and its role cannot be changed or assigned through the API.

There is no public signup: admins and HR create accounts with `POST /api/auth/register` (always role `employee`), and users then replace the initial password with `PATCH /api/auth/password`. The super admin and admins change roles with `PATCH /api/users/:id/role` (`admin`, `hr`, `manager` or `employee`; never your own role). A new role applies once the user logs in again or refreshes their token, because the role is carried in the access token.

## API overview

All routes are under the global `/api` prefix. Everything except register, login, refresh and health requires a bearer access token.

| Area        | Routes                                                                                                   | Access                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Auth        | `POST auth/login`, `POST auth/access-token/refresh`                                                      | public                                                                   |
|             | `POST auth/register`                                                                                     | admin, hr                                                                |
|             | `PATCH auth/password`, `POST auth/logout`                                                                | authenticated                                                            |
| Users       | `GET users/me` (includes the employee record, or `employee: null`)                                      | authenticated                                                            |
|             | `GET users/get/all`                                                                                      | admin, hr                                                                |
|             | `PATCH users/:id/role`                                                                                   | admin                                                                    |
| Departments | `POST departments/create`, `GET departments/get/all`, `GET departments/get/:id`, `PATCH departments/update`, `DELETE departments/delete/:id` | read: authenticated; create/update: admin, hr; delete: admin            |
| Employees   | `POST employees/create`, `GET employees/get/all`, `GET employees/get/:id`, `PATCH employees/update`, `DELETE employees/delete/:id`             | read: authenticated; create/update: admin, hr; delete: admin            |
| Attendance  | `POST attendance/check-in`, `POST attendance/check-out`, `GET attendance/me`                             | any user linked to an employee record                                    |
|             | `GET attendance/employee/:id`                                                                            | admin, hr: anyone; manager: self and reports                             |
|             | `GET attendance/summary`                                                                                 | admin, hr                                                                |
| Health      | `GET health`                                                                                             | public, not rate-limited                                                 |

Employee status controls access: `terminated`, `resigned` and `retired` users cannot log in or refresh tokens (their refresh tokens are revoked on the next refresh attempt, so an issued access token lasts at most `JWT_ACCESS_EXPIRES_IN`), and only `active` employees can check in or out (`on_leave` can log in but not record attendance). Users without an employee record, such as the bootstrap admin, are unaffected.

Attendance dates use the `Asia/Dhaka` timezone. The workday starts at 09:00 with 15 minutes' grace, and anything beyond 8 hours counts as overtime (`src/attendance/attendance.constants.ts`). Monthly endpoints take an optional `?month=YYYY-MM` and default to the current month.

## Environment variables

| Variable                                    | Required | Default                            | Description                                                                             |
| ------------------------------------------- | -------- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`                              | yes      | —                                  | PostgreSQL connection string                                                            |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | for Docker | —                      | Used by `docker-compose.yml` to create the database; must match `DATABASE_URL`          |
| `JWT_SECRET`                                | yes      | —                                  | Secret for signing access tokens                                                        |
| `THROTTLE_TTL`                              | yes      | —                                  | Rate-limit window (seconds)                                                             |
| `THROTTLE_LIMIT`                            | yes      | —                                  | Max requests per window                                                                 |
| `DB_POOL_MAX`                               | no       | `10`                               | pg pool size                                                                            |
| `DB_CONNECT_TIMEOUT_MS`                     | no       | `5000`                             | fail a pool checkout after this long instead of queueing forever                        |
| `DB_STATEMENT_TIMEOUT_MS`                   | no       | `15000`                            | Postgres `statement_timeout` for every connection                                       |
| `PORT`                                      | no       | `3000`                             | HTTP port                                                                               |
| `NODE_ENV`                                  | no       | `development`                      | `development` / `production` / `test`                                                   |
| `NAME` / `DESCRIPTION` / `VERSION`          | no       | starter defaults                   | Swagger document title, description and version                                         |
| `LOG_LEVEL`                                 | no       | `info` in production, else `debug` | pino log level                                                                          |
| `LOG_PRETTY`                                | no       | `false`                            | human-readable one-line logs (pino-pretty)                                              |
| `LOG_HTTP_BODIES`                           | no       | `false`                            | request bodies + response payloads in logs (redacted)                                   |
| `SWAGGER_ENABLED`                           | no       | `false`                            | serve Swagger UI at `/api` and `/docs`                                                  |
| `JWT_ACCESS_EXPIRES_IN`                     | no       | `300`                              | Access-token lifetime (seconds)                                                         |
| `JWT_REFRESH_EXPIRES_IN`                    | no       | `604800`                           | Refresh-token lifetime (seconds)                                                        |
| `CORS_ORIGINS`                              | no       | _(empty)_                          | Comma-separated allowed origins; empty disables CORS                                    |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | no (both or neither) | _(unset)_          | Super admin created on startup if none exists; password 8–72 characters, used only at creation |

The root `.env` is the single source of truth for local development, tests, Drizzle commands and Docker Compose. Process variables injected by the shell or deployment platform override values in `.env`.

## Project structure

```
src/
  auth/        register, login, refresh-token rotation, AuthGuard, RolesGuard
  user/        users and roles; GET /users/me
  employees/   employee records and the manager hierarchy
  department/  departments
  attendance/  check-in/out, monthly records, summary
  database/    Drizzle provider (DRIZZLE_ORM), schema/, pool lifecycle
  health/      GET /health (terminus + db ping)
  common/      response envelope, decorators, interceptors, exception filter
  config/      env validation, logger config
```

## Database changes

1. Edit or add a table in `src/database/schema/*.schema.ts` and re-export it from `src/database/schema/index.ts` (the runtime query API, e.g. `db.query.employees`, is built from that barrel).
2. `pnpm db:generate`, then **read the generated SQL** in `drizzle/migrations/`. drizzle-kit writes naive diffs for type changes, renames, enum edits and `serial`→identity conversions, so hand-edit the SQL if needed before it is applied anywhere.
3. `pnpm db:migrate`. To prove the whole chain replays from scratch: `docker compose down -v && docker compose up -d postgres && pnpm db:migrate`.
4. Commit the schema change together with the `.sql` file and `drizzle/migrations/meta/`. Never edit a migration that has already been applied to a shared database; add a new one instead.

## Adding a resource

Use `src/department/` as the reference: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts` and `dto/`.

- Only the repository touches the database; inject Drizzle with `@Inject(DRIZZLE_ORM)`.
- Guard routes with `@Auth()` and restrict them with `@Roles(...)`. Declare each route's success contract with `@ApiEnvelope(ResponseDto, { message })` and error codes with `@ApiErrorResponses(...)`. Return the raw service result; the global interceptor wraps it in the envelope.
- DTO files must end in `.dto.ts`. The `@nestjs/swagger` CLI plugin derives the OpenAPI schema from the TypeScript types and class-validator decorators, so `@ApiProperty` is only needed for examples or for types the plugin cannot express.
- Register the module in `AppModule`.

## Checks

There are no automated tests. Before committing:

```bash
pnpm lint:check          # eslint (type-checked rules + prettier)
pnpm typecheck           # tsc --noEmit
pnpm build
```

## Docker

```bash
docker build -t staffwise-api .
docker compose --profile full up   # postgres + api, using POSTGRES_* and JWT_SECRET from .env
```

Once postgres is up, apply migrations from the host: `pnpm db:migrate`.

## License

UNLICENSED.
