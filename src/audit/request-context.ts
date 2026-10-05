import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';

interface RequestContext {
  req: Request;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Express middleware (registered in createApp) that makes the current
 * request reachable from any service, so audit records know who acted
 * without every method taking the user as a parameter. The JWT payload
 * is read lazily, after AuthGuard has set `request.user`.
 */
export function requestContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  storage.run({ req }, next);
}

export function currentRequest(): Request | undefined {
  return storage.getStore()?.req;
}
