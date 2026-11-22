# ADR 0001: Stack, Runtime Boundaries, and Phase 1 Storage

- **Status:** Accepted
- **Date:** 2026-11-22
- **Owners:** Brandon (Founder), Yorkstead Principal Engineer

## Context
Field Closeout is a half-day demo wedge for 3–15 truck local trades contractors (HVAC, plumbing, electrical, fencing) that must be fast to build and deploy on Vercel while preserving a clean graduation path to an isolated paid pilot without rewriting the core data model or security boundaries.

## Decisions
1. **Yorkstead Default Stack:** Next.js App Router, TypeScript (strict), React, Tailwind CSS, Bun (`bun.lock`), PostgreSQL (Neon in hosted environments, Docker Postgres in local dev/CI), Drizzle ORM, Zod, and Playwright (E2E).
2. **Explicit Runtime Modes (`APP_RUNTIME_MODE`):**
   - `local` — Local development with synthetic seed data, role switcher, and demo reset enabled.
   - `hosted_demo` — Public/shared Vercel demo with synthetic seed data, role switcher, and demo reset enabled.
   - `protected_pilot` — Isolated tenant database; role switcher and demo reset hard-disabled at runtime; real auth required (implemented in Phase 2).
3. **Integer-Cents Money Representation:** All monetary columns use PostgreSQL `integer` (cents). Totals and threshold checks are computed exclusively on the server.
4. **Phase 1 Photo Storage (Zero External Infra):** Rather than provisioning S3/R2/Vercel Blob during the half-day demo wedge, Phase 1 accepts client-resized/compressed images (≤250KB JPEG/WebP data URLs validated server-side) alongside 2–3 built-in synthetic SVG/PNG job-site sample photos for one-tap demos. Object storage is deferred to Phase 2.
5. **No External Write-Backs in Phase 1:** No Twilio/SendGrid, Stripe, or QuickBooks/FSM APIs. Homeowner approval uses a copyable `/approve/[token]` link; office reconciliation uses a printable Closeout Summary + manual invoice reference field.

## Consequences
- Fast half-day delivery with zero third-party SaaS account friction.
- PostgreSQL + Drizzle migrations and tenant-scoped schema are production-ready from day one, avoiding a rewrite when a design partner signs for Phase 2.
- Photo payloads stored as bounded data URLs in `change_orders.photo_data_url` must be strictly size-capped (≤350KB encoded string) and MIME-validated (`image/jpeg`, `image/png`, `image/webp`) until migrated to object storage in Phase 2.
