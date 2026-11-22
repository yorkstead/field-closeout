# Design: 001-bootstrap-shell

## 1. Architecture & Directory Layout
```text
src/
├── app/
│   ├── layout.tsx              # Root layout with tenant theme + top demo bar
│   ├── page.tsx                # Redirects to /tech or /office based on active session role
│   ├── tech/page.tsx           # Placeholder shell for 002 (shows active jobs count & seeded tenant)
│   ├── office/page.tsx         # Placeholder shell for 003 (shows closeout queue summary)
│   └── api/
│       ├── health/route.ts     # DB + runtime mode health check
│       └── demo/
│           ├── session/route.ts # Switch demo role (tech | office) — 403 in protected_pilot
│           └── reset/route.ts   # Reseed synthetic demo data — 403 in protected_pilot
├── db/
│   ├── index.ts                # Drizzle client (pg Pool via DATABASE_URL)
│   ├── schema.ts               # All Phase 1 tables (tenant-scoped, integer cents)
│   └── seed.ts                 # Idempotent synthetic seed for Northstar Mechanical & Plumbing
└── lib/
    ├── runtime-mode.ts         # Zod-validated APP_RUNTIME_MODE helper
    ├── session.ts              # Server-side session reader (tenantId, userId, role)
    ├── tenant-theme.ts         # Tenant branding & disclaimer configuration helper
    └── money.ts                # Integer-cents formatting & safe arithmetic (no floats)
```

## 2. Database Schema (Drizzle + PostgreSQL)
All tables include `tenant_id` (UUID, FK → `tenants.id`) and `created_at` (`timestamp with time zone`).

- **`tenants`**: `id`, `slug` (unique), `name`, `trade_type`, `approval_threshold_cents` (integer, default `50000`), `disclaimer_text` (text), `theme_config` (jsonb: `{ primaryColor, accentColor, badgeLabel }`).
- **`users`**: `id`, `tenant_id`, `role` (enum `'tech' | 'office' | 'owner'`), `display_name`, `email` (unique per tenant).
- **`catalog_items`**: `id`, `tenant_id`, `name`, `description`, `unit_price_cents` (integer, check `>= 0`), `active` (boolean).
- **`jobs`**: `id`, `tenant_id`, `job_number`, `customer_name`, `service_address`, `assigned_tech_id` (FK → `users.id`), `status` (enum `'active' | 'completed'`).
- **`change_orders`**: `id`, `tenant_id`, `job_id` (FK → `jobs.id`), `created_by_user_id` (FK → `users.id`), `status` (enum `'pending_office' | 'pending_homeowner' | 'approved' | 'declined' | 'reconciled'`), `subtotal_cents` (integer, check `>= 0`), `notes` (text), `photo_data_url` (text, nullable), `approval_token` (text, unique, 32-byte hex), `reconciled_invoice_ref` (text, nullable), `reconciled_at` (timestamptz, nullable), `reconciled_by_user_id` (FK → `users.id`, nullable), `updated_at`.
- **`change_order_line_items`**: `id`, `tenant_id`, `change_order_id` (FK → `change_orders.id` ON DELETE CASCADE), `catalog_item_id` (FK → `catalog_items.id`, nullable), `title`, `description`, `quantity` (integer, check `> 0`), `unit_price_cents` (integer, check `>= 0`), `line_total_cents` (integer, check `>= 0`).
- **`approval_events`** (append-only): `id`, `tenant_id`, `change_order_id` (FK → `change_orders.id`), `event_type` (enum `'submitted' | 'office_approved' | 'office_adjusted' | 'homeowner_approved' | 'homeowner_declined' | 'reconciled'`), `actor_type` (enum `'tech' | 'office' | 'homeowner'`), `actor_name`, `approval_mode` (enum `'on_device' | 'share_link'`, nullable), `signature_payload` (text, nullable), `snapshot_total_cents` (integer), `snapshot_hash` (text, nullable).

## 3. Synthetic Seed Data (*Northstar Mechanical & Plumbing*)
- 1 tenant (`northstar-mechanical`), threshold `50000` (\$500.00), disclaimer: *"Change-Order Record Only — pre-tax flat-rate estimate. Not payment processing, tax advice, or legal advice."*
- 2 users: `Marcus Cole` (`tech`) and `Dana Reyes` (`office`).
- 6 flat-rate catalog items (e.g., *Replace Corroded Shutoff Valve — \$180*, *Install Surge Protector on Condenser — \$245*, *Upgrade to Smart Thermostat — \$320*, *Replace Expansion Tank — \$390*, *Run Dedicated 20A Circuit — \$650*, *Replace Main Pressure Reducing Valve — \$580*).
- 4 synthetic active jobs with clearly fictional customer names and addresses.
- 3 pre-seeded sample change orders across statuses (`pending_office`, `pending_homeowner`, `approved`) so the Office Closeout Queue looks alive immediately on first load.

## 4. Invariants
- `APP_RUNTIME_MODE` defaults to `local` in dev; if set to `protected_pilot`, `POST /api/demo/session` and `POST /api/demo/reset` MUST return `403 Forbidden`, and demo controls MUST NOT render in the UI.
- `src/lib/money.ts` uses integer math only; unit tests verify exact cents formatting and rejection of non-integer inputs.
- Drizzle migrations live in `drizzle/` and are checked into git.
