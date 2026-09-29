ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'employee'::text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'hr', 'manager', 'employee');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'employee'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE IF EXISTS "departments_id_seq";--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "departments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('"departments"', 'id'), COALESCE((SELECT MAX("id") FROM "departments"), 0) + 1, false);--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE IF EXISTS "employees_id_seq";--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "employees_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('"employees"', 'id'), COALESCE((SELECT MAX("id") FROM "employees"), 0) + 1, false);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE IF EXISTS "users_id_seq";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('"users"', 'id'), COALESCE((SELECT MAX("id") FROM "users"), 0) + 1, false);--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE IF EXISTS "refresh_tokens_id_seq";--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "refresh_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('"refresh_tokens"', 'id'), COALESCE((SELECT MAX("id") FROM "refresh_tokens"), 0) + 1, false);