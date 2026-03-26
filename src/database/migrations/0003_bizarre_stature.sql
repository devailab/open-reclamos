ALTER TABLE "complaints" ADD COLUMN "official_response" text;--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "responded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "responded_by" uuid;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;