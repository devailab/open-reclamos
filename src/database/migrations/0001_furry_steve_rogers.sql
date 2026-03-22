ALTER TABLE "stores" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;