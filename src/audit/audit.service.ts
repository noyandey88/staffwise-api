import { Injectable, Logger } from '@nestjs/common';
import type { JwtPayload } from '../auth/auth.types.js';
import { currentRequest } from './request-context.js';
import { diff } from './audit.util.js';
import { AuditRepository } from './audit.repository.js';
import { AuditLogQueryDto } from './dto/audit-log.dto.js';
import { pageWindow, paginated } from '../common/utils/pagination.util.js';

export interface AuditEntry {
  /** <entity>.<verb>, e.g. "salary.created". */
  action: string;
  entityType: string;
  entityId: number | string;
  /** Record before the change (omit for creates). */
  before?: object | null;
  /** Record after the change (omit for deletes). */
  after?: object | null;
  metadata?: Record<string, unknown>;
}

/**
 * Records sensitive changes. Call it after the change succeeds. The actor
 * and IP come from the current request. A failed write is logged, not
 * thrown: the change itself has already happened.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditRepository: AuditRepository) {}

  async find(query: AuditLogQueryDto) {
    const window = pageWindow(query);
    const { items, total } = await this.auditRepository.findPage(
      {
        actorUserId: query.actorUserId,
        action: query.action,
        entityType: query.entityType,
        entityId: query.entityId,
        from: query.from,
        to: query.to,
      },
      window,
    );
    return paginated(items, total, window);
  }

  async record(entry: AuditEntry): Promise<void> {
    const req = currentRequest();
    // Set by AuthGuard on authenticated routes.
    const user = (req as { user?: JwtPayload } | undefined)?.user;
    const changes =
      entry.before !== undefined || entry.after !== undefined
        ? diff(entry.before, entry.after)
        : null;
    try {
      await this.auditRepository.insert({
        actorUserId: user?.sub ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: String(entry.entityId),
        changes: changes && Object.keys(changes).length ? changes : null,
        metadata: entry.metadata ?? null,
        ip: req?.ip ?? null,
      });
    } catch (err) {
      this.logger.error({ err, action: entry.action }, 'Audit write failed');
    }
  }
}
