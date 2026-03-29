ALTER TABLE "complaints" ADD COLUMN "draft_response" text;--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "draft_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "draft_saved_by" uuid;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_draft_saved_by_users_id_fk" FOREIGN KEY ("draft_saved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;