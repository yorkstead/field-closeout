# AGENTS.md — Field Closeout

Tool-agnostic engineering rules read by both **Antigravity** and **OpenCode** agents working in this repository.

## 1. Product & Commercial Boundaries
- **Product:** Field Closeout — reusable vertical SaaS for local residential/light-commercial trades contractors (HVAC, plumbing, electrical, fencing; 3–15 trucks) to capture mid-job add-ons, get zero-login homeowner approval, and reconcile approved add-ons before final invoicing.
- **Reusable product first:** Never hardcode a single contractor's identity into core logic. Keep company name, trade type, flat-rate add-on catalog, approval threshold, disclaimer copy, and branding tenant-configurable (`src/lib/tenant-theme.ts` and `tenants` table).
- **Phase 1 boundary:** Change-Order Record Only. Do **not** add payment processing, sales tax calculation, legal/tax advice claims, SMS/email providers, live QuickBooks/FSM API write-backs, or self-serve signup unless an approved OpenSpec change explicitly adds them.
- **Zero real PII:** Never commit real customer names, addresses, phone numbers, emails, photos, credentials, or financial records into git, fixtures, logs, or screenshots.

## 2. Source of Truth (OpenSpec)
- `openspec/specs/` — current living behavioral specifications by domain.
- `openspec/changes/<NNN-name>/` — active numbered changes (`proposal.md`, `design.md`, `specs/<domain>/spec.md`, `tasks.md`).
- `docs/domain-rules.md` — strict separation of **Confirmed Customer Facts**, **Proposed Demo Assumptions**, and **Open Questions**. Never silently guess unconfirmed rules.
- `docs/handoffs/CURRENT.md` — active phase, change queue, and last verified commit SHA.

## 3. Non-Negotiable Engineering Invariants
1. **Exact money math:** Store and compute all currency as **integer minor units (cents)**. Never use floating-point `number` arithmetic for money, and never trust client-submitted subtotals or line totals.
2. **Server-side authority:** Enforce authentication/session, role authorization (`tech | office | owner`), tenant scoping (`tenant_id`), and approval threshold routing exclusively on the server.
3. **Immutable post-decision records:** Once a change order is `approved`, `declined`, or `reconciled`, its line items and totals MUST NOT be modified. Every state transition appends an immutable row to `approval_events` (including a SHA-256 `snapshot_hash` on homeowner approval).
4. **Scoped public approval token:** `/approve/[token]` must use a cryptographically random, unguessable token, expose only that single change order's customer-facing scope/total/photo/disclaimer, and be idempotent (single decision).
5. **Runtime boundary (`APP_RUNTIME_MODE`):** Explicitly distinguish `local`, `hosted_demo`, and `protected_pilot`. Demo role switching and demo data reset MUST be hard-disabled in `protected_pilot`.

## 4. Branching, Verification & Gates
- **Target branch:** Always branch off `next` using `feat/<change-id>` (e.g., `feat/001-bootstrap-shell`) and open PRs targeting `next`.
- **Owner gates:** Never commit directly to `main`, never merge to `main`, and never deploy production or run production DB migrations without explicit owner approval.
- **Single verification command:** Run `bun run verify` before opening or updating any PR. Never claim a check passed without running it and pasting real output in the PR summary.
- **Portability:** Always check off completed items in the change's `tasks.md` and update `docs/handoffs/CURRENT.md` when handing off between sessions or tools.
