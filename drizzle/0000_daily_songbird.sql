CREATE TYPE "public"."actor_type" AS ENUM('tech', 'office', 'homeowner');--> statement-breakpoint
CREATE TYPE "public"."approval_event_type" AS ENUM('submitted', 'office_approved', 'office_adjusted', 'homeowner_approved', 'homeowner_declined', 'reconciled');--> statement-breakpoint
CREATE TYPE "public"."approval_mode" AS ENUM('on_device', 'share_link');--> statement-breakpoint
CREATE TYPE "public"."change_order_status" AS ENUM('pending_office', 'pending_homeowner', 'approved', 'declined', 'reconciled');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('tech', 'office', 'owner');--> statement-breakpoint
CREATE TABLE "approval_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"change_order_id" uuid NOT NULL,
	"event_type" "approval_event_type" NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_name" text NOT NULL,
	"approval_mode" "approval_mode",
	"signature_payload" text,
	"snapshot_total_cents" integer NOT NULL,
	"snapshot_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_order_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"change_order_id" uuid NOT NULL,
	"catalog_item_id" uuid,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"status" "change_order_status" NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"photo_data_url" text,
	"approval_token" text NOT NULL,
	"reconciled_invoice_ref" text,
	"reconciled_at" timestamp with time zone,
	"reconciled_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "change_orders_approval_token_unique" UNIQUE("approval_token")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"job_number" text NOT NULL,
	"customer_name" text NOT NULL,
	"service_address" text NOT NULL,
	"assigned_tech_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"trade_type" text NOT NULL,
	"approval_threshold_cents" integer DEFAULT 50000 NOT NULL,
	"disclaimer_text" text NOT NULL,
	"theme_config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_change_order_id_change_orders_id_fk" FOREIGN KEY ("change_order_id") REFERENCES "public"."change_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_line_items" ADD CONSTRAINT "change_order_line_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_line_items" ADD CONSTRAINT "change_order_line_items_change_order_id_change_orders_id_fk" FOREIGN KEY ("change_order_id") REFERENCES "public"."change_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_line_items" ADD CONSTRAINT "change_order_line_items_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_reconciled_by_user_id_users_id_fk" FOREIGN KEY ("reconciled_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assigned_tech_id_users_id_fk" FOREIGN KEY ("assigned_tech_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_email_idx" ON "users" USING btree ("tenant_id","email");