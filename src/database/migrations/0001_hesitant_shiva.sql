CREATE TABLE "complaint_tag_assignments" (
	"complaint_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "complaint_tag_assignments_complaint_id_tag_id_pk" PRIMARY KEY("complaint_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "complaint_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"endpoint_id" uuid,
	"event_key" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"request_body" jsonb,
	"response_status" integer,
	"response_body" text,
	"error_message" text,
	"next_attempt_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"target_url" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"secret_encrypted" text,
	"custom_headers" jsonb,
	"timeout_ms" integer DEFAULT 15000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "priority" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "receipt_delivery_status" text;--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "receipt_delivery_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "receipt_delivery_error" text;--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "response_delivery_status" text;--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "response_delivery_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "response_delivery_error" text;--> statement-breakpoint
ALTER TABLE "complaint_tag_assignments" ADD CONSTRAINT "complaint_tag_assignments_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_tag_assignments" ADD CONSTRAINT "complaint_tag_assignments_tag_id_complaint_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."complaint_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_tag_assignments" ADD CONSTRAINT "complaint_tag_assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_tags" ADD CONSTRAINT "complaint_tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_tags" ADD CONSTRAINT "complaint_tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_tags" ADD CONSTRAINT "complaint_tags_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complaint_tag_assignments_tag_id_idx" ON "complaint_tag_assignments" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "complaint_tags_organization_id_idx" ON "complaint_tags" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "complaint_tags_organization_id_name_uidx" ON "complaint_tags" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_organization_id_created_at_idx" ON "webhook_deliveries" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_endpoint_id_idx" ON "webhook_deliveries" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_status_created_at_idx" ON "webhook_deliveries" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_event_key_idx" ON "webhook_deliveries" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_organization_id_idx" ON "webhook_endpoints" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_status_idx" ON "webhook_endpoints" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_endpoints_org_slug_uidx" ON "webhook_endpoints" USING btree ("organization_id","slug");