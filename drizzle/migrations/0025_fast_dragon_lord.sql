CREATE TYPE "public"."blood_group" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('permanent', 'contract', 'intern', 'part_time');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE SEQUENCE "public"."employee_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "employee_code" varchar(20);--> statement-breakpoint
-- Number existing employees by id, then continue the sequence after them.
WITH numbered AS (SELECT "id", row_number() OVER (ORDER BY "id") AS n FROM "employees")
UPDATE "employees" e SET "employee_code" = 'EMP-' || lpad(numbered.n::text, 5, '0')
  FROM numbered WHERE e."id" = numbered."id";--> statement-breakpoint
SELECT setval('employee_code_seq', GREATEST((SELECT count(*) FROM "employees"), 1), (SELECT count(*) FROM "employees") > 0);--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "employee_code" SET DEFAULT ('EMP-' || lpad(nextval('employee_code_seq')::text, 5, '0'));--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "employee_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "employment_type" "employment_type" DEFAULT 'permanent' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "probation_end_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "contract_end_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "gender" "gender";--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "blood_group" "blood_group";--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "national_id" varchar(30);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "phone" varchar(30);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "present_address" varchar(255);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "permanent_address" varchar(255);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "emergency_contact_name" varchar(100);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "emergency_contact_relationship" varchar(50);--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "emergency_contact_phone" varchar(30);--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code");--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_national_id_unique" UNIQUE("national_id");