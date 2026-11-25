# Developer Start Here — Field Closeout

Welcome to **Field Closeout**. This repo follows the shared Yorkstead Spec Kit workflow (`docs/dev-workflow.md`) from change 004 on. Phase 1 (001–003) was built with **OpenSpec**; that history and the living domain specs stay in `openspec/`.

## Quick Start
1. Read [AGENTS.md](../AGENTS.md) and [docs/handoffs/CURRENT.md](./handoffs/CURRENT.md).
2. Read [docs/domain-rules.md](./domain-rules.md) to confirm what is verified vs. provisional.
3. Pick the assigned spec under `specs/<NNN>-<slug>/` and read `spec.md`, `plan.md`, `tasks.md`, plus the related domain spec in `openspec/specs/<domain>/spec.md`.
4. Branch from `next`:
   ```bash
   git checkout next && git pull origin next
   git checkout -b feat/<change-id>
   ```

## Commands
- `bun install` — install dependencies (once `001-bootstrap-shell` scaffolds Next.js)
- `bun run verify` — single authoritative verification gate (lint, typecheck, migration check, unit tests, production build, E2E)
- `bun run dev` — start local Next.js dev server (added in `001`)
- `bun run db:migrate` / `bun run db:seed` — apply Drizzle migrations and load synthetic demo data (added in `001`)

## Local Postgres (Starting in `001-bootstrap-shell`)
Local development and CI use PostgreSQL (Docker locally or Neon connection string via `DATABASE_URL`). Never connect local dev or `hosted_demo` to a `protected_pilot` database.

## Key Quirks & Guardrails
- **Money is always integer cents (`integer` in Postgres).** Format for display only at the UI boundary (`formatCents(cents)`).
- **Never trust client totals or threshold routing.** Recompute line totals, subtotal, and `pending_office` vs. `pending_homeowner` routing on the server.
- **No external infra in Phase 1.** Photos use client-side compression (≤250KB data URL) plus built-in synthetic job-site sample photos. No S3/Blob, no Twilio, no Stripe, no QuickBooks API.

## Definition of Done (Every Change PR)
- [ ] All checkboxes in `specs/<NNN>-<slug>/tasks.md` are checked off, and `verification.md` is written.
- [ ] `bun run verify` passes locally with zero skipped tests or suppressed lint/type errors.
- [ ] PR targets `next` with real `bun run verify` output and a short summary of any deviations.
- [ ] `docs/handoffs/CURRENT.md` is updated if handoff state changed.
