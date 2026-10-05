ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_reviewed_by_employees_id_fk";
--> statement-breakpoint
-- reviewed_by now holds a user id; convert reviews recorded under the old employee-id meaning.
UPDATE "leave_requests" lr SET "reviewed_by" = e."user_id" FROM "employees" e WHERE e."id" = lr."reviewed_by";--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
