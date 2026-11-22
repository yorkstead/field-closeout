# Proposal: 004-pilot-auth-sms-and-disclosures

- **Phase:** Phase 2 — Real-Data Paid Pilot Gate
- **Status:** **BLOCKED — Awaiting Design Partner Discovery & Written Confirmation of Open Questions in `docs/domain-rules.md`**
- **Target Branch:** `next` (PR from `feat/004-pilot-auth-sms-and-disclosures`)

## Why
Graduate Field Closeout from the 100% fictional Phase 1 demo wedge (`local` / `hosted_demo`) to an isolated paid pilot (`protected_pilot`) for our first 3–15 truck contractor design partner.

## Prerequisites (Must Be Completed Before Authoring `design.md` & `tasks.md`)
1. Design partner commits to a 30-day pilot with 2–5 active trucks and shares their real flat-rate add-on catalog and approval threshold rules.
2. All 5 Open Questions in `docs/domain-rules.md` (state/local legal disclosures, sales tax stance, field custom-pricing guardrails, primary billing system of record, photo retention/privacy) are confirmed in writing.
3. Isolated Neon PostgreSQL database provisioned for `protected_pilot` (never shared with `hosted_demo`).

## Planned Scope (High-Level)
- Real server-side authentication & tenant provisioning for `protected_pilot`.
- Remove all `CANONICAL_DEMO_TENANT` SSR fallbacks in `src/app/layout.tsx`, `src/app/tech/**`, and `src/app/office/**` when `APP_RUNTIME_MODE === 'protected_pilot'` (strictly require authenticated `session.tenantId` and role checks).
- Real SMS approval link delivery (e.g., Twilio) with opt-out/audit logging.
- Object storage (Vercel Blob / R2) for job-site photos replacing bounded data URLs.
- Tenant-configurable state/local legal disclosure templates and license number display on `/approve/[token]` and Closeout Summary.
