CREATE TYPE "public"."unapproved_remote_check_in" AS ENUM('block', 'flag');--> statement-breakpoint
CREATE TYPE "public"."work_location" AS ENUM('office', 'remote');--> statement-breakpoint
CREATE TYPE "public"."remote_work_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "remote_work_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "remote_work_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"employee_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" varchar(255) NOT NULL,
	"status" "remote_work_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "attendance_policies" ADD COLUMN "unapproved_remote_check_in" "unapproved_remote_check_in" DEFAULT 'block' NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "work_location" "work_location";--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "outside_arrangement" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "remote_work_requests" ADD CONSTRAINT "remote_work_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remote_work_requests" ADD CONSTRAINT "remote_work_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "remote_work_requests_employee_idx" ON "remote_work_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "remote_work_requests_pending_idx" ON "remote_work_requests" USING btree ("status") WHERE "remote_work_requests"."status" = 'pending';--> statement-breakpoint
-- An employee's pending/approved remote-work requests must not overlap
-- (btree_gist was created in 0023).
ALTER TABLE "remote_work_requests" ADD CONSTRAINT "remote_work_requests_no_overlap"
  EXCLUDE USING gist (
    "employee_id" WITH =,
    daterange("start_date", "end_date", '[]') WITH &&
  ) WHERE ("status" IN ('pending', 'approved'));
