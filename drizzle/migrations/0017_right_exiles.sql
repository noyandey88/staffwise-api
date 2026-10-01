CREATE TABLE "company_profile" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"legal_name" varchar(150) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"logo_url" varchar(500),
	"favicon_url" varchar(500),
	"primary_color" varchar(7),
	"accent_color" varchar(7),
	"support_email" varchar(255),
	"phone" varchar(30),
	"website" varchar(255),
	"address" varchar(255),
	"tax_id" varchar(50),
	"currency" char(3) DEFAULT 'BDT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "company_profile_singleton" CHECK ("company_profile"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "employee_bank_accounts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "employee_bank_accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"employee_id" integer NOT NULL,
	"account_holder_name" varchar(150) NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"branch_name" varchar(100),
	"account_number" varchar(34) NOT NULL,
	"routing_number" varchar(20),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "employee_bank_accounts_employee_account_uq" UNIQUE("employee_id","account_number")
);
--> statement-breakpoint
ALTER TABLE "pay_slips" ADD COLUMN "bank_account_holder_name" varchar(150);--> statement-breakpoint
ALTER TABLE "pay_slips" ADD COLUMN "bank_name" varchar(100);--> statement-breakpoint
ALTER TABLE "pay_slips" ADD COLUMN "bank_branch_name" varchar(100);--> statement-breakpoint
ALTER TABLE "pay_slips" ADD COLUMN "bank_account_number" varchar(34);--> statement-breakpoint
ALTER TABLE "pay_slips" ADD COLUMN "bank_routing_number" varchar(20);--> statement-breakpoint
ALTER TABLE "employee_bank_accounts" ADD CONSTRAINT "employee_bank_accounts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "employee_bank_accounts_one_primary_idx" ON "employee_bank_accounts" USING btree ("employee_id") WHERE "employee_bank_accounts"."is_primary";--> statement-breakpoint
ALTER TABLE "pay_slips" ADD CONSTRAINT "pay_slips_run_employee_uq" UNIQUE("payroll_run_id","employee_id");