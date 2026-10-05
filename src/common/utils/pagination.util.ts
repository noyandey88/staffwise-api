import {
  DEFAULT_PAGE_SIZE,
  type PaginationQueryDto,
} from '../dto/pagination-query.dto.js';

/** Payload of a paginated list (see `@ApiEnvelope(..., { paginated: true })`). */
export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PageWindow {
  page: number;
  limit: number;
  offset: number;
}

export function pageWindow(query: PaginationQueryDto): PageWindow {
  const page = query.page ?? 1;
  const limit = query.limit ?? DEFAULT_PAGE_SIZE;
  return { page, limit, offset: (page - 1) * limit };
}

export function paginated<T>(
  items: T[],
  total: number,
  { page, limit }: PageWindow,
): Paginated<T> {
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}

/** Escapes LIKE wildcards so user search text matches literally. */
export function likePattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, '\\$&')}%`;
}
