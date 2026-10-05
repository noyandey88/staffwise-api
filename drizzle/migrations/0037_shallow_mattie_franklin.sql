CREATE TYPE "public"."office_check_in_verification" AS ENUM('none', 'ip', 'location', 'ip_or_location');--> statement-breakpoint
CREATE TABLE "offices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "offices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"radius_meters" integer,
	"ip_ranges" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "offices_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "attendance_policies" ADD COLUMN "office_check_in_verification" "office_check_in_verification" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "office_id" integer;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD COLUMN "verified_by" varchar(10);--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;