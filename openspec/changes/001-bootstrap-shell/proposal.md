# Proposal: 001-bootstrap-shell

- **Phase:** Phase 1 — Half-Day Demo Wedge
- **Target Branch:** `next` (PR from `feat/001-bootstrap-shell`)

## Why
Establish the walking skeleton for **Field Closeout** on the Yorkstead default stack (Next.js App Router, TypeScript strict, Tailwind CSS, Bun, PostgreSQL + Drizzle ORM, Zod, Playwright) with explicit runtime boundaries (`local` | `hosted_demo` | `protected_pilot`), tenant-configurable theming, synthetic seed + demo reset, and a working `bun run verify` gate so `002` and `003` can build features rapidly with zero architectural drift.

## Scope (In)
- Initialize Next.js App Router + TypeScript (strict) + Tailwind CSS + ESLint + Playwright + Bun (`bun.lock`).
- Implement `APP_RUNTIME_MODE` (`local` | `hosted_demo` | `protected_pilot`) runtime guard in `src/lib/runtime-mode.ts`.
- Define Drizzle ORM schema and initial SQL migration for all Phase 1 tables (`tenants`, `users`, `catalog_items`, `jobs`, `change_orders`, `change_order_line_items`, `approval_events`) with integer-cents columns and tenant foreign keys.
- Create `src/lib/tenant-theme.ts` and `src/lib/money.ts` (integer cents formatting and exact arithmetic helpers).
- Build synthetic seed script and idempotent **Reset Demo Data** API (`POST /api/demo/reset`, disabled in `protected_pilot`) for fictional tenant *Northstar Mechanical & Plumbing*.
- Build demo role-switcher session (`POST /api/demo/session`, cookie-backed, disabled in `protected_pilot`) supporting `Field Tech` (`tech`) and `Office Manager` (`office`) views.
- Build a clean mobile-responsive app shell with top bar (tenant branding, active role switcher, Reset Demo button, navigation between `/tech` and `/office` placeholders).
- Upgrade `bun run verify` to run `lint`, `typecheck`, `db:migrate`, `test:unit`, `build`, and `test:e2e`.

## Non-Goals (Out)
- Field add-on creation flow (`002-field-capture-and-threshold`).
- Homeowner approval page and Office Closeout Queue (`003-homeowner-approval-and-closeout`).
- Real authentication, SMS delivery, or payment/tax integrations.
