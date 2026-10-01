// src/common/interceptors/response.interceptor.ts
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiResponse } from '../interfaces/api-response.interface.js';
import { RESPONSE_MESSAGE_KEY } from '../decorators/api-envelope.decorator.js';
import { getHttpStatusName } from '../utils/http-status.util.js';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T> | StreamableFile
> {
  constructor(private readonly reflector: Reflector = new Reflector()) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | StreamableFile> {
    const res = context.switchToHttp().getResponse<Response>();
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ??
      'Request successful';

    return next.handle().pipe(
      // File downloads (e.g. the payroll bank file) bypass the envelope.
      map((payload: T) =>
        payload instanceof StreamableFile
          ? payload
          : {
              success: true,
              status: getHttpStatusName(res.statusCode),
              message,
              payload: payload ?? null,
            },
      ),
    );
  }
}
