# Handoff: field-closeout, draft specs 006, 007, 008 (spec files only, no code)

_Handoff packet written by Claude (PM) on 2026-11-26 at Brandon's request. Point the OpenCode `developer` agent at this file._

Repo and branch: yorkstead/field-closeout @ feat/006-008-demo-readiness-specs (from origin/next @ 91458a7 or newer)
Agent: developer
Read first: AGENTS.md, docs/dev-workflow.md, docs/handoffs/CURRENT.md, .specify/memory/constitution.md, specs/INDEX.md, docs/domain-rules.md, .specify/templates/overrides/spec-template.md, plan-template.md, tasks-template.md

## Goal
We start contacting 10 Colorado HVAC and plumbing shops on Mon 2026-11-30 and will walk them through the hosted demo at field-closeout.vercel.app. Write three Spec Kit specs that get the demo ready for those calls. This batch writes spec files only. Do not change application code, config, the database, Vercel, or GitHub settings.

Create each folder with `.specify/scripts/bash/create-new-feature.sh` so numbers come out as 006, 007, 008 (004 stays reserved). For each spec write `spec.md` from the house override template, with Status: Draft. Also write `plan.md` and `tasks.md` from the override templates, with the plan listing the exact files an implementer may touch and each task sized to one session with its own verify command. Put anything you are unsure of under Open questions or the Decision register as Open; do not guess.

## Spec 006: isolated demo sessions and locked-down reset
Problem today: the hosted demo uses one shared Postgres database, no login, and a public Reset Demo button (`POST /api/demo/reset`, `src/components/DemoHeader.tsx`). Two prospects using it at once see each other's change orders, and anyone can wipe the demo mid-call.
Outcome: each demo visitor (or each prospect link) works on their own copy of the Northstar demo data, and only that visitor's data can be reset.
Must cover:
- How a visitor gets an isolated demo (for example a per-visitor demo tenant created from the seed on first visit, keyed by an httpOnly cookie, or a per-prospect link created by Brandon). Compare at least two options in the Decision register and recommend one.
- Reset only affects the caller's own demo data; no route can reset or read another visitor's data. Tenant scoping stays server-side (AGENTS.md invariant 2).
- Cleanup of old demo tenants (age limit, and how it runs without new paid services).
- `protected_pilot` behavior is unchanged: demo tenants, role switching and reset stay hard-disabled there (invariant 5).
- The zero-login `/approve/[token]` flow still works inside an isolated demo.
- Any schema change needs an ordered migration and `bun run db:migrate:check`; note rollback.
- Acceptance criteria as Given/When/Then, including: two browsers in separate sessions never see each other's change orders; reset in one session leaves the other untouched; existing unit and e2e tests still pass.

## Spec 007: demo script and one-page explainer
Outcome: Brandon (and Erica) can run a consistent 10-minute walkthrough, and a prospect has one page to read before or after a call.
Must cover:
- A demo script in the repo (suggest `docs/sales/demo-script.md`): the 10-minute flow (tech adds a $180 add-on, homeowner signs on the tech's phone, office closeout queue, printable summary, mark reconciled to an invoice number; then a $650 add-on showing office review above the $500 threshold), talking points per step, and common objections from HVAC and plumbing owners with short answers. Keep claims inside the Phase 1 boundary: change-order record only, no payments, tax, legal advice, SMS or QuickBooks sync.
- A one-page explainer. Decide in the Decision register whether it is a public page in the app (for example `/how-it-works`, static, no data access) or a document outside the app, and recommend one. It must work on a phone, use only fictional data, and link into the demo.
- No pricing in anything public. License prices stay out of the explainer.
- Acceptance criteria that Brandon can check by reading and by clicking through on a phone.

## Spec 008: handoff doc and README refresh
Outcome: the repo's entry docs match reality.
Must cover:
- `docs/handoffs/CURRENT.md`: record that the hosted demo is live on Vercel (production = `main` at 5925540, `APP_RUNTIME_MODE=hosted_demo`), update the last verified commit, and list specs 006 to 008 as queued. Keep the historical tables and the Phase 2 blocker.
- `README.md` (currently one line): what the product is, Phase 1 scope boundary, local setup with Bun and Docker Postgres (`.env.example`, `bun run db:migrate`, `bun run db:seed`, `bun run dev`), `bun run verify`, runtime modes, and links to AGENTS.md, docs/dev-workflow.md and specs/INDEX.md. No secrets, no pricing, no real customer data.
- Acceptance criteria: a new developer can go from clone to a passing `bun run verify` by following the README alone.

## Also
- Add rows for 006, 007 and 008 to `specs/INDEX.md` and move "Next free number" to 009.
- Add a dated entry at the top of `docs/handoffs/CURRENT.md` saying these three specs were drafted and await Brandon's approval (this is only a handoff note; the full refresh is spec 008's job).

## Don't
Touch files other than the new spec folders, specs/INDEX.md and the CURRENT.md entry. Write application code. Add dependencies. Run migrations against any non-local database. Merge, deploy, or change Vercel or GitHub settings. Contact anyone.

## Verify
`bun run verify` must still pass (nothing outside docs should change). Paste the real output summary in the PR.

## Finish
Commit, push the branch, open a draft PR into `next` using `.github/pull_request_template.md`, titled "Specs 006-008: demo readiness (draft for approval)". Then stop and report. Brandon approves each spec before anyone implements it.

## Stop and report if
A requirement here conflicts with AGENTS.md or the constitution, a spec needs a new paid service or secret, or the same check fails twice.
