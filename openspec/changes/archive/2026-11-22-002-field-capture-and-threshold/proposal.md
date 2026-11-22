# Proposal: 002-field-capture-and-threshold

- **Phase:** Phase 1 — Half-Day Demo Wedge
- **Target Branch:** `next` (PR from `feat/002-field-capture-and-threshold`)
- **Depends On:** `001-bootstrap-shell`

## Why
Field techs won't use a heavy FSM form mid-job with dirty hands. This change delivers the <30-second mobile-first **Field Add-On Capture** flow backed by server-side integer-cents calculation, automatic office-approval threshold routing, and append-only audit events.

## Scope (In)
- Mobile-first Tech Job List (`/tech`) displaying active jobs assigned to the tenant's tech with existing change orders and status badges.
- Fast **Add-On Capture** flow (`/tech/jobs/[jobId]/new-change-order`):
  - One-tap selection from the tenant's flat-rate add-on catalog (with quantity stepper).
  - Optional custom line item entry (title, description, quantity, flat-rate unit price in dollars converted cleanly to integer cents).
  - Optional photo attachment: either client-side compressed file upload (≤250KB JPEG/WebP/PNG) **or** one-tap selection from 3 built-in synthetic job-site sample photos for fast demo walkthroughs.
  - Optional field note.
- Server-side `POST /api/change-orders` endpoint:
  - Enforces authenticated `tech` (or `office`/`owner`) session and `tenant_id` scoping.
  - Validates payload with Zod (including photo MIME and encoded length ≤350KB).
  - Recomputes all line totals and `subtotal_cents` server-side from catalog prices (when `catalog_item_id` is provided) or validated integer cents (for custom items).
  - Routes status server-side: `subtotal_cents <= tenant.approval_threshold_cents` → `pending_homeowner`; `subtotal_cents > tenant.approval_threshold_cents` → `pending_office`.
  - Generates a cryptographically random 32-byte hex `approval_token` and appends a `submitted` row to `approval_events`.
- Post-submit confirmation screen showing the routed status, copyable homeowner approval link (when `pending_homeowner`), "Hand Phone to Homeowner" button (linking to `/approve/[token]?mode=on_device`), or "Sent to Office for Price Review" banner (when `pending_office`).

## Non-Goals (Out)
- Homeowner approval submission logic and Office Closeout Queue UI (`003-homeowner-approval-and-closeout`).
- S3/R2/Vercel Blob photo storage (deferred to Phase 2 per ADR 0001).
- Sales tax calculation.
