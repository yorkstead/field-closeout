# Current Handoff State — Field Closeout

- **Active Phase:** Phase 1 — **COMPLETE & ARCHIVED** (2026-11-22)
- **Next Phase:** Phase 2 — Real-Data Paid Pilot Gate (Blocked on design partner discovery)
- **Default Target Branch:** `next`
- **Last Verified Commit SHA:** `2e6c2f2` (PR #3 merged to `next`; Phase 1 Gate passed)
- **Runtime Mode Target:** `local` & `hosted_demo` (100% synthetic data; *Northstar Mechanical & Plumbing*)

## Process change — 2026-11-25 (Spec 005, PR to `next`)
- New changes use the shared Yorkstead Spec Kit workflow (`docs/dev-workflow.md`, `specs/INDEX.md`); OpenSpec archive and living domain specs stay in `openspec/`. `004-pilot-auth-sms-and-disclosures` moves to `specs/004-...` when it unblocks.
- Added Spec Kit v1.4.4 with OpenCode commands, override templates, constitution v1.0.0, OpenCode `developer`/`reviewer` agents (supersede `docs/prompts/`), PR template, `CLAUDE.md`. Docs and agent configuration only.

## Completed & Archived Changes (Phase 1)

| Phase | Change ID | PR | Archive Path | Summary |
| :--- | :--- | :--- | :--- | :--- |
| Phase 1 | `001-bootstrap-shell` | #1 (`ca88fdf`) | `openspec/changes/archive/2026-11-22-001-bootstrap-shell/` | Next.js + Tailwind + Drizzle/Postgres schema, `APP_RUNTIME_MODE` guard, `tenant-theme.ts`, synthetic seed + demo reset, role-switcher session, `bun run verify` + CI |
| Phase 1 | `002-field-capture-and-threshold` | #2 (`290766f`) | `openspec/changes/archive/2026-11-22-002-field-capture-and-threshold/` | Mobile-first Tech Job List & <30s Add-On Capture (flat-rate catalog + custom item + optional photo), server-side integer-cents math, threshold routing (`<= $500` vs `> $500`), append-only audit events |
| Phase 1 | `003-homeowner-approval-and-closeout` | #3 (`2e6c2f2`) | `openspec/changes/archive/2026-11-22-003-homeowner-approval-and-closeout/` | Dual-mode zero-login Homeowner Approval (`/approve/[token]` + on-device + SHA-256 snapshot hash), PostgreSQL immutability triggers, Office Closeout Queue, printable/exportable Closeout Summary, Mark Reconciled to Invoice # |

## Queued Changes (Phase 2)

| Phase | Change ID | Status | Summary |
| :--- | :--- | :--- | :--- |
| Phase 2 | `004-pilot-auth-sms-and-disclosures` | **Blocked on Discovery** | Real auth & isolated tenant provisioning, remove `CANONICAL_DEMO_TENANT` SSR fallbacks in `protected_pilot`, SMS approval links, object photo storage, state-specific legal disclosures & confirmed tax/pricing rules |

## Next Action
1. **Deploy `hosted_demo` (owner gate):** Provision a Neon demo DB + Vercel project with `APP_RUNTIME_MODE=hosted_demo` and run `bun run db:migrate && bun run db:seed` for live 10-minute contractor walkthroughs.
2. **Design Partner Discovery:** Answer the 5 Open Questions in `docs/domain-rules.md` before unlocking `004-pilot-auth-sms-and-disclosures`.
