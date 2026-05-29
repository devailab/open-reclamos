ALTER TABLE "organization_settings" ADD COLUMN "mcp_enabled_tools" text;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD COLUMN "mcp_show_sensitive_data" boolean DEFAULT true NOT NULL;