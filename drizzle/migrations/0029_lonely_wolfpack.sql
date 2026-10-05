CREATE TYPE "public"."separation_status" AS ENUM('requested', 'approved', 'completed', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."separation_type" AS ENUM('resignation', 'termination', 'retirement');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('draft', 'finalized', 'paid');--> statement-breakpoint
CREATE TABLE "final_settlements" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "final_settlements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"separation_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"status" "settlement_status" DEFAULT 'draft' NOT NULL,
	"currency" char(3) NOT NULL,
	"lines" jsonb NOT NULL,
	"total_earnings" numeric(12, 2) NOT NULL,
	"total_deductions" numeric(12, 2) NOT NULL,
	"net_pay" numeric(12, 2) NOT NULL,
	"finalized_by" integer,
	"finalized_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "final_settlements_separation_id_unique" UNIQUE("separation_id")
);
--> statement-breakpoint
CREATE TABLE "separations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "separations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"employee_id" integer NOT NULL,
	"type" "separation_type" NOT NULL,
	"status" "separation_status" DEFAULT 'requested' NOT NULL,
	"reason" varchar(500) NOT NULL,
	"last_working_day" date NOT NULL,
	"requested_by" integer,
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN "is_encashable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "final_settlements" ADD CONSTRAINT "final_settlements_separation_id_separations_id_fk" FOREIGN KEY ("separation_id") REFERENCES "public"."separations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_settlements" ADD CONSTRAINT "final_settlements_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_settlements" ADD CONSTRAINT "final_settlements_finalized_by_users_id_fk" FOREIGN KEY ("finalized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "separations" ADD CONSTRAINT "separations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "separations" ADD CONSTRAINT "separations_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "separations" ADD CONSTRAINT "separations_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "separations_open_uq" ON "separations" USING btree ("employee_id") WHERE "separations"."status" IN ('requested', 'approved');