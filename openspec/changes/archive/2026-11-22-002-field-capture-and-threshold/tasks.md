# Tasks: 002-field-capture-and-threshold

## Service Layer & API
- [x] Create `src/lib/change-orders.ts` containing Zod validation schemas, server-side catalog price resolution, integer-cents subtotal math, threshold routing, and transactional DB insert + `approval_events` append.
- [x] Add unit tests for `src/lib/change-orders.ts` covering catalog price authority, custom line items, exact threshold boundary (`<= threshold` vs `> threshold`), and invalid photo rejection.
- [x] Implement `GET /api/jobs`, `GET /api/catalog`, and `POST /api/change-orders` with strict server-side session & `tenant_id` scoping.

## Mobile-First Tech UI
- [x] Add 3 lightweight synthetic sample photos under `public/demo-photos/` and a client-side image compression helper (≤250KB) in `src/lib/photo-client.ts`.
- [x] Build `/tech` active job list showing job details, existing change order badges, and prominent **"Add Change Order"** CTA.
- [x] Build `/tech/jobs/[jobId]/new-change-order` mobile-first capture form (one-tap flat-rate catalog chips, custom line item modal/section, photo upload or sample photo picker, live pre-tax total preview, threshold indicator).
- [x] Build `/tech/change-orders/[id]` post-submit handoff screen (copyable `/approve/[token]` link + **"Hand Phone to Homeowner"** button when `pending_homeowner`, or **"Awaiting Office Price Approval"** banner when `pending_office`).

## Verification
- [x] Add Playwright E2E tests covering: (1) under-threshold add-on creation → `pending_homeowner` + copyable link, and (2) over-threshold add-on creation → `pending_office`.
- [x] Run `bun run verify` and confirm all checks pass.
- [x] Update `docs/handoffs/CURRENT.md` and open PR targeting `next`.
