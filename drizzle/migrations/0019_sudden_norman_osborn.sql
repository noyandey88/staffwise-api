ALTER TABLE "payroll_runs" DROP CONSTRAINT "payroll_runs_approved_by_employees_id_fk";
--> statement-breakpoint
-- approved_by now holds a user id; convert runs approved under the old employee-id meaning.
UPDATE "payroll_runs" pr SET "approved_by" = e."user_id" FROM "employees" e WHERE e."id" = pr."approved_by";--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN "is_paid" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Payroll previously treated a type named 'Unpaid' as unpaid; keep that behaviour.
UPDATE "leave_types" SET "is_paid" = false WHERE lower("name") = 'unpaid';--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
