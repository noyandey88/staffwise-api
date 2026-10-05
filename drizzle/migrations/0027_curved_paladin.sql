CREATE TYPE "public"."salary_certificate_status" AS ENUM('requested', 'issued', 'rejected', 'cancelled');--> statement-breakpoint
CREATE SEQUENCE "public"."salary_certificate_ref_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "salary_certificates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "salary_certificates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"employee_id" integer NOT NULL,
	"purpose" varchar(200) NOT NULL,
	"addressed_to" varchar(200),
	"status" "salary_certificate_status" DEFAULT 'requested' NOT NULL,
	"reference_no" varchar(30),
	"snapshot" jsonb,
	"requested_by" integer,
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "salary_certificates_reference_no_unique" UNIQUE("reference_no")
);
--> statement-breakpoint
ALTER TABLE "company_profile" ADD COLUMN "signatory_name" varchar(100);--> statement-breakpoint
ALTER TABLE "company_profile" ADD COLUMN "signatory_title" varchar(100);--> statement-breakpoint
ALTER TABLE "salary_certificates" ADD CONSTRAINT "salary_certificates_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_certificates" ADD CONSTRAINT "salary_certificates_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_certificates" ADD CONSTRAINT "salary_certificates_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "salary_certificates_open_request_uq" ON "salary_certificates" USING btree ("employee_id") WHERE "salary_certificates"."status" = 'requested';