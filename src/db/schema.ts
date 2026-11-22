import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { TenantThemeConfig } from "../lib/tenant-theme";

// Enums
export const userRoleEnum = pgEnum("user_role", ["tech", "office", "owner"]);
export const jobStatusEnum = pgEnum("job_status", ["active", "completed"]);
export const changeOrderStatusEnum = pgEnum("change_order_status", [
  "pending_office",
  "pending_homeowner",
  "approved",
  "declined",
  "reconciled",
]);
export const approvalEventTypeEnum = pgEnum("approval_event_type", [
  "submitted",
  "office_approved",
  "office_adjusted",
  "homeowner_approved",
  "homeowner_declined",
  "reconciled",
]);
export const actorTypeEnum = pgEnum("actor_type", ["tech", "office", "homeowner"]);
export const approvalModeEnum = pgEnum("approval_mode", ["on_device", "share_link"]);

// 1. Tenants Table
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tradeType: text("trade_type").notNull(),
  approvalThresholdCents: integer("approval_threshold_cents").notNull().default(50000),
  disclaimerText: text("disclaimer_text").notNull(),
  themeConfig: jsonb("theme_config").$type<TenantThemeConfig>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Users Table
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull(),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_tenant_email_idx").on(table.tenantId, table.email),
  ]
);

// 3. Catalog Items Table
export const catalogItems = pgTable("catalog_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Jobs Table
export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  jobNumber: text("job_number").notNull(),
  customerName: text("customer_name").notNull(),
  serviceAddress: text("service_address").notNull(),
  assignedTechId: uuid("assigned_tech_id")
    .notNull()
    .references(() => users.id),
  status: jobStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 5. Change Orders Table
export const changeOrders = pgTable("change_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id),
  status: changeOrderStatusEnum("status").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  notes: text("notes").default("").notNull(),
  photoDataUrl: text("photo_data_url"),
  approvalToken: text("approval_token").notNull().unique(),
  reconciledInvoiceRef: text("reconciled_invoice_ref"),
  reconciledAt: timestamp("reconciled_at", { withTimezone: true }),
  reconciledByUserId: uuid("reconciled_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Change Order Line Items Table
export const changeOrderLineItems = pgTable("change_order_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  changeOrderId: uuid("change_order_id")
    .notNull()
    .references(() => changeOrders.id, { onDelete: "cascade" }),
  catalogItemId: uuid("catalog_item_id").references(() => catalogItems.id),
  title: text("title").notNull(),
  description: text("description").default("").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  lineTotalCents: integer("line_total_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. Approval Events Table (Immutable Audit Log)
export const approvalEvents = pgTable("approval_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  changeOrderId: uuid("change_order_id")
    .notNull()
    .references(() => changeOrders.id, { onDelete: "cascade" }),
  eventType: approvalEventTypeEnum("event_type").notNull(),
  actorType: actorTypeEnum("actor_type").notNull(),
  actorName: text("actor_name").notNull(),
  approvalMode: approvalModeEnum("approval_mode"),
  signaturePayload: text("signature_payload"),
  snapshotTotalCents: integer("snapshot_total_cents").notNull(),
  snapshotHash: text("snapshot_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
