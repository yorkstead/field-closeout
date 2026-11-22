# Tasks: 001-bootstrap-shell

## Setup & Scaffolding
- [ ] Initialize Next.js (App Router, TypeScript strict, Tailwind CSS, ESLint) with Bun (`bun.lock`) and configure `drizzle-kit` + `playwright`.
- [ ] Add `docker-compose.yml` for local PostgreSQL 16 and `.env.example` documenting `DATABASE_URL` and `APP_RUNTIME_MODE`.

## Core Libraries & Database
- [ ] Implement `src/lib/runtime-mode.ts` (`local` | `hosted_demo` | `protected_pilot` guard) with unit tests.
- [ ] Implement `src/lib/money.ts` (integer-cents helpers + `formatCents`) with unit tests covering edge cases and non-integer rejection.
- [ ] Implement `src/lib/tenant-theme.ts` for tenant branding and compliance disclaimer config.
- [ ] Define full Phase 1 schema in `src/db/schema.ts`, configure `src/db/index.ts`, and generate initial Drizzle migration in `drizzle/`.
- [ ] Implement idempotent synthetic seed in `src/db/seed.ts` (*Northstar Mechanical & Plumbing* — 0 real PII).

## API & App Shell
- [ ] Implement `src/lib/session.ts` (cookie-backed demo session in `local`/`hosted_demo`, strict rejection in `protected_pilot`).
- [ ] Implement `GET /api/health`, `POST /api/demo/session`, and `POST /api/demo/reset` (with 403 guard in `protected_pilot`).
- [ ] Build mobile-responsive App Shell (`src/app/layout.tsx`, `src/app/page.tsx`, `src/app/tech/page.tsx`, `src/app/office/page.tsx`) showing tenant branding, active role switcher, and Reset Demo button.

## Verification
- [ ] Wire `package.json` `verify` script to run: `lint`, `typecheck`, `db:migrate`, `test:unit`, `build`, and `test:e2e`.
- [ ] Add Playwright E2E smoke test verifying shell load, role switch (`tech` ↔ `office`), and demo reset.
- [ ] Run `bun run verify` and confirm all checks pass.
- [ ] Update `docs/handoffs/CURRENT.md` and open PR targeting `next`.
