import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches } from 'class-validator';

/** A real calendar date in YYYY-MM-DD form (rejects e.g. 2026-02-31). */
export function IsDateOnly(): PropertyDecorator {
  return applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/, {
      message: ({ property }) => `${property} must be in YYYY-MM-DD format`,
    }),
    IsISO8601(
      { strict: true },
      { message: ({ property }) => `${property} must be a valid date` },
    ),
  );
}
