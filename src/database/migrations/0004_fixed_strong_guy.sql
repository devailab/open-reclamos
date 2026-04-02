ALTER TABLE "users" ADD COLUMN "api_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "api_key_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_api_key_unique" UNIQUE("api_key");