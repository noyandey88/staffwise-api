CREATE TYPE "public"."work_arrangement_scope" AS ENUM('company', 'department', 'employee');--> statement-breakpoint
CREATE TYPE "public"."work_mode" AS ENUM('onsite', 'remote', 'hybrid');--> statement-breakpoint
CREATE TABLE "work_arrangements" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "work_arrangements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"scope" "work_arrangement_scope" NOT NULL,
	"department_id" integer,
	"employee_id" integer,
	"mode" "work_mode" NOT NULL,
	"office_days" integer[],
	"office_days_per_week" integer,
	"effective_from" date NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "work_arrangements_target" CHECK (("work_arrangements"."scope" = 'company' AND "work_arrangements"."department_id" IS NULL AND "work_arrangements"."employee_id" IS NULL)
       OR ("work_arrangements"."scope" = 'department' AND "work_arrangements"."department_id" IS NOT NULL AND "work_arrangements"."employee_id" IS NULL)
       OR ("work_arrangements"."scope" = 'employee' AND "work_arrangements"."employee_id" IS NOT NULL AND "work_arrangements"."department_id" IS NULL)),
	CONSTRAINT "work_arrangements_hybrid" CHECK (("work_arrangements"."mode" = 'hybrid' AND (
            (cardinality("work_arrangements"."office_days") > 0 AND "work_arrangements"."office_days_per_week" IS NULL)
         OR ("work_arrangements"."office_days" IS NULL AND "work_arrangements"."office_days_per_week" BETWEEN 1 AND 7)))
       OR ("work_arrangements"."mode" <> 'hybrid' AND "work_arrangements"."office_days" IS NULL AND "work_arrangements"."office_days_per_week" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "work_arrangements" ADD CONSTRAINT "work_arrangements_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_arrangements" ADD CONSTRAINT "work_arrangements_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_arrangements" ADD CONSTRAINT "work_arrangements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "work_arrangements_target_from_uq" ON "work_arrangements" USING btree ("scope",coalesce("department_id", 0),coalesce("employee_id", 0),"effective_from");--> statement-breakpoint
CREATE INDEX "work_arrangements_employee_idx" ON "work_arrangements" USING btree ("employee_id");