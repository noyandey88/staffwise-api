CREATE TYPE "public"."document_category" AS ENUM('contract', 'id_proof', 'certificate', 'photo', 'other');--> statement-breakpoint
CREATE TABLE "employee_documents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "employee_documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"employee_id" integer NOT NULL,
	"category" "document_category" NOT NULL,
	"title" varchar(150) NOT NULL,
	"file_key" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "employee_documents_file_key_unique" UNIQUE("file_key")
);
--> statement-breakpoint
ALTER TABLE "company_profile" ADD COLUMN "logo_file_key" varchar(255);--> statement-breakpoint
ALTER TABLE "company_profile" ADD COLUMN "logo_content_type" varchar(100);--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_documents_employee_idx" ON "employee_documents" USING btree ("employee_id");