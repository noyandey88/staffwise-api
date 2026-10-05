CREATE TABLE "notices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" varchar(150) NOT NULL,
	"body" text NOT NULL,
	"department_id" integer,
	"pinned" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notices_published_at_idx" ON "notices" USING btree ("published_at");