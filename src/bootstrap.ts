import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import helmet from 'helmet';
import { requestContextMiddleware } from './audit/request-context.js';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { DebugPayloadInterceptor } from './common/interceptors/debug-payload.interceptor.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Builds the fully configured application: logger, security middleware,
 * CORS, validation, envelope, error filter, and Swagger. `main.ts` calls
 * this and then listens. Add global wiring here, not in `main.ts`.
 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.enableShutdownHooks();

  const trustProxy = app.get(ConfigService).get<string>('TRUST_PROXY')!;
  app.set(
    'trust proxy',
    trustProxy === 'true'
      ? true
      : trustProxy === 'false'
        ? false
        : /^\d+$/.test(trustProxy)
          ? Number(trustProxy)
          : trustProxy,
  );
  app.use(helmet());
  // Lets AuditService find the acting user without threading it through calls.
  app.use(requestContextMiddleware);

  const configService = app.get(ConfigService);
  const corsOrigins = (configService.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins });
    logger.log(`CORS enabled for origins: ${corsOrigins.join(', ')}`);
  } else {
    logger.warn(
      'CORS disabled (CORS_ORIGINS is empty); cross-origin browser requests will fail',
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  // Registered after ResponseInterceptor so it taps the raw payload.
  // Flag-gated: response payloads may contain PII.
  if (configService.get<boolean>('LOG_HTTP_BODIES')) {
    app.useGlobalInterceptors(new DebugPayloadInterceptor());
  }
  app.useGlobalFilters(new AllExceptionsFilter());

  app.setGlobalPrefix('api');

  if (configService.get<boolean>('SWAGGER_ENABLED')) {
    const config = new DocumentBuilder()
      .setTitle(configService.getOrThrow<string>('NAME'))
      .setDescription(configService.getOrThrow<string>('DESCRIPTION'))
      .setVersion(configService.getOrThrow<string>('VERSION'))
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
        'access-token',
      )
      .build();
    // One generated document, served whole at /api and split by audience:
    // /docs (employee app) and /docs/admin (back office, /api/admin/*).
    const full = SwaggerModule.createDocument(app, config);
    const isAdmin = (path: string) => path.startsWith('/api/admin');
    const subset = (keep: (path: string) => boolean): OpenAPIObject => ({
      ...full,
      paths: Object.fromEntries(
        Object.entries(full.paths).filter(([path]) => keep(path)),
      ),
    });
    SwaggerModule.setup('api', app, full);
    // Register the longer path first so /docs does not swallow /docs/admin.
    SwaggerModule.setup('docs/admin', app, subset(isAdmin), {
      jsonDocumentUrl: 'docs/admin-json',
    });
    SwaggerModule.setup(
      'docs',
      app,
      subset((path) => !isAdmin(path)),
      {
        jsonDocumentUrl: 'docs-json',
      },
    );
  }

  return app;
}
