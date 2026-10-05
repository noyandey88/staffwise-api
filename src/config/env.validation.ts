import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');
// NB: z.coerce.boolean() is a trap — it coerces the *string* "false" to true.

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    PORT: z.coerce.number().int().positive().default(3000),

    NAME: z.string().min(1).default('Nestjs Starter'),
    DESCRIPTION: z.string().min(1).default('The LMS description'),
    VERSION: z.string().min(1).default('1.0'),

    // Logging — values, not name-checks
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
      .optional(),
    LOG_PRETTY: booleanString,
    LOG_HTTP_BODIES: booleanString,

    SWAGGER_ENABLED: booleanString,

    // Same code everywhere, different numbers per stage file (required).
    THROTTLE_TTL: z.coerce.number().int().positive(),
    THROTTLE_LIMIT: z.coerce.number().int().positive(),

    DATABASE_URL: z.url(),
    /** pg pool size. */
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    /** Fail a pool checkout after this many ms instead of queueing forever. */
    DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    /** Postgres statement_timeout applied to every connection (ms). */
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
    JWT_SECRET: z.string().min(1),
    /** Access-token lifetime in seconds. */
    JWT_ACCESS_EXPIRES_IN: z.coerce.number().int().positive().default(300),
    /** Refresh-token lifetime in seconds. */
    JWT_REFRESH_EXPIRES_IN: z.coerce.number().int().positive().default(604800),
    /**
     * Express "trust proxy" so request IPs (office check-in verification,
     * audit log) are the client's behind a load balancer: false, true, a
     * hop count, or addresses/subnets (e.g. "loopback, 10.0.0.0/8").
     */
    TRUST_PROXY: z.string().default('false'),
    /** Comma-separated list of allowed origins. Empty disables CORS. */
    CORS_ORIGINS: z.string().default(''),
    /** Super admin seeded on startup when none exists. Set both or neither. */
    SUPER_ADMIN_EMAIL: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email())
      .optional(),
    /** Only used when the super admin is first created; 72 is bcrypt's limit. */
    SUPER_ADMIN_PASSWORD: z.string().min(8).max(72).optional(),

    /** 'log' writes emails to the log instead of sending (dev without SMTP). */
    MAIL_TRANSPORT: z.enum(['log', 'smtp']).default('log'),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    /** true = implicit TLS (port 465); false = STARTTLS when offered. */
    SMTP_SECURE: booleanString,
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    /** e.g. "Staffwise <no-reply@example.com>". */
    MAIL_FROM: z.string().min(3).default('Staffwise <no-reply@localhost>'),
    /** Front-end base URL used in email links (reset/setup password). */
    WEB_APP_URL: z.url().default('http://localhost:5173'),
    /** Forgot-password link lifetime in seconds. */
    PASSWORD_RESET_EXPIRES_IN: z.coerce.number().int().positive().default(3600),
    /** Where uploaded files live: 'local' disk or any S3-compatible store. */
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    /** Directory for STORAGE_DRIVER=local (relative to the working dir). */
    STORAGE_LOCAL_DIR: z.string().min(1).default('storage'),
    S3_BUCKET: z.string().min(1).optional(),
    S3_REGION: z.string().min(1).default('us-east-1'),
    /** For MinIO, R2, Spaces, …; omit for AWS. */
    S3_ENDPOINT: z.url().optional(),
    /** Omit both to use the AWS default credential chain (IAM role, …). */
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    /** true for MinIO and most self-hosted S3 servers. */
    S3_FORCE_PATH_STYLE: booleanString,
    /** Largest accepted upload, in bytes. */
    UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(10_485_760),

    /** New-account "set your password" link lifetime in seconds. */
    ACCOUNT_SETUP_EXPIRES_IN: z.coerce
      .number()
      .int()
      .positive()
      .default(259200),
  })
  .refine((env) => !env.SUPER_ADMIN_EMAIL === !env.SUPER_ADMIN_PASSWORD, {
    message: 'set both SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD, or neither',
    path: ['SUPER_ADMIN_PASSWORD'],
  })
  .refine((env) => env.MAIL_TRANSPORT !== 'smtp' || env.SMTP_HOST, {
    message: 'SMTP_HOST is required when MAIL_TRANSPORT=smtp',
    path: ['SMTP_HOST'],
  })
  .refine((env) => env.STORAGE_DRIVER !== 's3' || env.S3_BUCKET, {
    message: 'S3_BUCKET is required when STORAGE_DRIVER=s3',
    path: ['S3_BUCKET'],
  })
  .refine((env) => !env.S3_ACCESS_KEY_ID === !env.S3_SECRET_ACCESS_KEY, {
    message: 'set both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or neither',
    path: ['S3_SECRET_ACCESS_KEY'],
  })
  .refine((env) => !env.SMTP_USER === !env.SMTP_PASSWORD, {
    message: 'set both SMTP_USER and SMTP_PASSWORD, or neither',
    path: ['SMTP_PASSWORD'],
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${result.error.issues
        .map((i) => `  ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    );
  }
  return result.data;
}
