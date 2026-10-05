CREATE TABLE "holidays" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "holidays_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"date" date NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "holidays_date_unique" UNIQUE("date")
);
--> statement-breakpoint
ALTER TABLE "company_profile" ADD COLUMN "weekend_days" integer[] DEFAULT '{5,6}' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "leave_balances_employee_type_year_idx" ON "leave_balances" USING btree ("employee_id","leave_type_id","year");