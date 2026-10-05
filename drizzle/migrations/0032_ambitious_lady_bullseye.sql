CREATE TABLE "work_weeks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "work_weeks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"effective_from" date NOT NULL,
	"weekend_days" integer[] NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "work_weeks_effective_from_unique" UNIQUE("effective_from")
);
--> statement-breakpoint
ALTER TABLE "work_weeks" ADD CONSTRAINT "work_weeks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Carry over the current weekend as the work week for all of history
-- (the company setting, or the old default Friday + Saturday).
INSERT INTO "work_weeks" ("effective_from", "weekend_days")
  SELECT '1900-01-01', coalesce((SELECT "weekend_days" FROM "company_profile" WHERE "id" = 1), '{5,6}');--> statement-breakpoint
ALTER TABLE "company_profile" DROP COLUMN "weekend_days";