# Current Handoff State — Field Closeout

- **Active Phase:** Phase 1 — Half-Day Demo Wedge (Fictional Demo)
- **Default Target Branch:** `next`
- **Last Verified Commit SHA:** `5c4fccd` (`feat/002-field-capture-and-threshold`)
- **Runtime Mode Target:** `local` & `hosted_demo` (100% synthetic data; *Northstar Mechanical & Plumbing*)

## Change Queue

| Phase | Change ID | Status | Summary |
| :--- | :--- | :--- | :--- |
| Phase 1 | `001-bootstrap-shell` | **Merged** | Next.js + Tailwind + Drizzle/Postgres schema, `APP_RUNTIME_MODE` guard, `tenant-theme.ts`, synthetic seed + demo reset, role-switcher session, `bun run verify` + CI |
| Phase 1 | `002-field-capture-and-threshold` | **Ready for Review** | Mobile-first Tech Job List & <30s Add-On Capture (flat-rate catalog + custom item + optional photo), server-side integer-cents math, threshold routing (`<= $500` vs `> $500`), append-only audit events |
| Phase 1 | `003-homeowner-approval-and-closeout` | Queued (depends on `002`) | Dual-mode zero-login Homeowner Approval (on-device + `/approve/[token]` with signature + SHA-256 snapshot hash), Office Closeout Queue, printable/exportable Closeout Summary, Mark Reconciled to Invoice # |
| Phase 2 | `004-pilot-auth-sms-and-disclosures` | Planned (post-discovery) | Real auth & isolated tenant provisioning, SMS approval links, state-specific legal disclosures, confirmed tax/pricing rules |

## Next Action
Review and merge `feat/002-field-capture-and-threshold` PR into `next` via `yorkstead-openspec-reviewer`, then proceed to `003-homeowner-approval-and-closeout`.
