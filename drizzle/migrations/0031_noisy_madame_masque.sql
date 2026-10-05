CREATE TYPE "public"."pay_component_calculation" AS ENUM('fixed', 'percent_of_basic', 'percent_of_gross');--> statement-breakpoint
CREATE TYPE "public"."pay_component_kind" AS ENUM('earning', 'deduction');--> statement-breakpoint
CREATE TABLE "employee_pay_components" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "employee_pay_components_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"employee_id" integer NOT NULL,
	"component_id" integer NOT NULL,
	"value" numeric(12, 2),
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pay_components" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pay_components_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"kind" "pay_component_kind" NOT NULL,
	"calculation" "pay_component_calculation" NOT NULL,
	"default_value" numeric(12, 2) NOT NULL,
	"applies_to_all" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "pay_components_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "pay_slips" ADD COLUMN "gross_pay" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "pay_slips" ADD COLUMN "lines" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- Existing payslips: gross was basic + allowances, and the only deduction was unpaid leave.
UPDATE "pay_slips" SET
  "gross_pay" = "base_pay" + "allowances",
  "lines" = CASE WHEN "deductions" > 0 THEN jsonb_build_array(jsonb_build_object(
    'label', 'Unpaid leave', 'kind', 'deduction', 'amount', "deductions"::text,
    'source', 'unpaid_leave', 'note', "unpaid_leave_days" || ' working day(s) × basic / 30'))
  ELSE '[]'::jsonb END;--> statement-breakpoint
ALTER TABLE "pay_slips" ALTER COLUMN "gross_pay" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_pay_components" ADD CONSTRAINT "employee_pay_components_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_pay_components" ADD CONSTRAINT "employee_pay_components_component_id_pay_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."pay_components"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_pay_components_employee_idx" ON "employee_pay_components" USING btree ("employee_id");