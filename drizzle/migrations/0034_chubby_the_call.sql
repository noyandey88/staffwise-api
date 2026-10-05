CREATE TABLE "attendance_policies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "attendance_policies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"effective_from" date NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"work_start_time" time NOT NULL,
	"late_grace_minutes" integer NOT NULL,
	"standard_work_minutes" integer NOT NULL,
	"correction_window_days" integer NOT NULL,
	"max_shift_hours" integer NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "attendance_policies_effective_from_unique" UNIQUE("effective_from"),
	CONSTRAINT "attendance_policies_grace" CHECK ("attendance_policies"."late_grace_minutes" BETWEEN 0 AND 720),
	CONSTRAINT "attendance_policies_standard" CHECK ("attendance_policies"."standard_work_minutes" BETWEEN 1 AND 1440),
	CONSTRAINT "attendance_policies_window" CHECK ("attendance_policies"."correction_window_days" BETWEEN 0 AND 366),
	CONSTRAINT "attendance_policies_shift" CHECK ("attendance_policies"."max_shift_hours" BETWEEN 1 AND 48)
);
--> statement-breakpoint
ALTER TABLE "attendance_policies" ADD CONSTRAINT "attendance_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The rules that were hardcoded until now, in force for all of history.
INSERT INTO "attendance_policies" ("effective_from", "timezone", "work_start_time", "late_grace_minutes", "standard_work_minutes", "correction_window_days", "max_shift_hours")
  VALUES ('1900-01-01', 'Asia/Dhaka', '09:00', 15, 480, 30, 24);
