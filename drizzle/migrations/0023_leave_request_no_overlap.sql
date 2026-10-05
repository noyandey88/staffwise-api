-- LeaveRepository.create maps 23P01 to 409, but the constraint it relies on
-- was never created. An employee's pending/approved requests must not overlap.
-- Fails if overlapping rows already exist; resolve those first.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_no_overlap"
  EXCLUDE USING gist (
    "employee_id" WITH =,
    daterange("start_date", "end_date", '[]') WITH &&
  ) WHERE ("status" IN ('pending', 'approved'));
