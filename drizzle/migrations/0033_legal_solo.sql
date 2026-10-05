CREATE TYPE "public"."day_count" AS ENUM('fixed', 'calendar_days', 'working_days');--> statement-breakpoint
CREATE TYPE "public"."rate_base" AS ENUM('basic', 'gross');--> statement-breakpoint
CREATE TABLE "payroll_policy" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"unpaid_leave_rate_base" "rate_base" DEFAULT 'basic' NOT NULL,
	"unpaid_leave_divisor" "day_count" DEFAULT 'fixed' NOT NULL,
	"unpaid_leave_fixed_days" integer DEFAULT 30 NOT NULL,
	"encashment_rate_base" "rate_base" DEFAULT 'basic' NOT NULL,
	"encashment_divisor" "day_count" DEFAULT 'fixed' NOT NULL,
	"encashment_fixed_days" integer DEFAULT 30 NOT NULL,
	"pro_rata_method" "day_count" DEFAULT 'calendar_days' NOT NULL,
	"pro_rata_fixed_days" integer DEFAULT 30 NOT NULL,
	"prorate_joiners" boolean DEFAULT false NOT NULL,
	"prorate_fixed_components" boolean DEFAULT false NOT NULL,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "payroll_policy_singleton" CHECK ("payroll_policy"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "pay_slips" ADD COLUMN "pro_rata_note" varchar(200);--> statement-breakpoint
ALTER TABLE "payroll_policy" ADD CONSTRAINT "payroll_policy_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;