ALTER TABLE "org"."organizations" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "org"."organizations" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "org"."organizations" ADD COLUMN "suspended_by" uuid;--> statement-breakpoint
ALTER TABLE "org"."organizations" ADD COLUMN "suspension_reason" text;--> statement-breakpoint
ALTER TABLE "org"."organizations" ADD CONSTRAINT "organizations_suspended_by_users_id_fk" FOREIGN KEY ("suspended_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;