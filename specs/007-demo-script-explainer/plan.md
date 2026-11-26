# Implementation plan: Ten-minute demo script and one-page explainer

**Spec:** [spec.md](./spec.md)

## Approach
After Brandon resolves D1–D6 and the spec owner moves this spec to Approved/In progress in a separate planning/status edit, write one canonical sales script and one standalone static HTML explainer. Add only the targeted `/how-it-works` rewrite; do not add an app route or touch the root layout. Cover the script's real UI flow and static public page in two focused Playwright files, deriving dynamic record/token locations from the UI so 006 local work remains independent. The script must forbid shared hosted reset/prospect use until caller-isolated reset is deployed and verified (D6). Finish with the full repository gate and Brandon's separate local/isolated read-through/physical-phone run.

## Files and boundaries
Implementers may touch only the files listed here; anything else needs a plan update first.

| Area / file | Change | Risk |
|---|---|---|
| `docs/sales/demo-script.md` | New: preflight, exact 600-second run-of-show, speaker cues, HVAC/plumbing talking points, objections, Phase 1 disclaimers, fictional-only warning, and recovery note | Medium: labels, print timing, or totals could drift from actual behavior |
| `public/how-it-works.html` | New: one self-contained responsive static explainer with inline CSS, fictional/demo disclosure, workflow summary, Phase 1 boundary, and absolute live-demo CTA; no JavaScript session/API calls | Medium: public copy could overclaim or separate styling could drift |
| `next.config.mjs` | Add only a targeted rewrite from `/how-it-works` to `/how-it-works.html`; preserve `reactStrictMode` and all existing route behavior | Medium: an overly broad rewrite could intercept app routes, so the source/destination must be exact |
| `tests/e2e/demo-script.spec.ts` | New: assert script timeline arithmetic/required copy and exercise the $180 on-device approval/closeout plus $650 office-review path using the D3/D4 choices | Medium: tests must not depend on fixed approval tokens or wait ten real minutes |
| `tests/e2e/how-it-works.spec.ts` | New: assert both static URLs, response/content requirements, demo CTA, no contractor demo chrome, no forbidden commercial/Phase 2 claims, and 390×844 layout | Low |
| `specs/007-demo-script-explainer/tasks.md` | Tick completed tasks and maintain resumable state | Low |
| `specs/007-demo-script-explainer/verification.md` | New at T001 and updated after every task: actual commands/output, AC results, phone/read-through evidence, limitations, and deployment status | Low |
| `docs/handoffs/CURRENT.md` | Add dated 007 handoff evidence and synchronize its 007 queue status with this spec without overwriting 006/008 state | Low |
| `specs/INDEX.md` | Add/update only the 007 link, title, and current spec status; preserve other rows and numbering history | Low |

Spec-owner-only status exception: Claude/Brandon, not the implementer, may change `specs/007-demo-script-explainer/spec.md` between Draft → Approved/In progress → Review/Done in separate planning/review edits. The implementer mirrors the then-current status in CURRENT/INDEX and never marks Done while D6, owner phone evidence, or release checks remain pending.

No other file is editable by the implementer. In particular, do not touch `src/**`, `package.json`, lockfiles, migrations/seed data, `public/demo-photos/**`, existing tests, `.env*`, deployment configuration, `README.md`, `openspec/**`, or the 006/008 spec folders. No app page under `src/app/how-it-works` and no outside-only second explainer may be introduced without a revised approved plan.

## Data and migrations
- Schema change: none. Seed, reset, and approval behavior are exercised only against the existing local synthetic database by tests. No hosted migration/seed/reset is authorized. Code rollback is removal of the static file, rewrite, docs, and tests; there is no data rollback.

## Phases and gates
1. **Specification/status gate:** Brandon selects D1–D6 and approves; the spec owner separately moves spec.md to Approved/In progress before T001. Confirm exact $650 line, print-first/reconcile-first choice, and hosted-use gate before authoring.
2. **Script and public explainer:** T001 writes/tests script against real local UI; T002 adds/tests static page/rewrite. Every task runs current-revision `bun run verify` and updates verification/tasks/CURRENT before completion.
3. **Owner usability gate:** T003 records Brandon's read-through and physical-phone click-through only in local/LAN, verified isolated preview, or post-D6 hosted use, including elapsed time/CTA. Presenter correction is a failure, not a verbal workaround. Shared hosted reset/prospect use stays blocked pre-006.
4. **Repository close-out:** T004 makes INDEX/CURRENT/task-state edits before final verify, then appends only verification output. Spec owner alone handles later Review/Done status; merge/deploy and post-D6 hosted prospect use remain Brandon's gates.

## Verification strategy
- Automated: every task runs current-revision `bun run verify`; supplement with `bun run build && bunx playwright test --config playwright.config.ts tests/e2e/demo-script.spec.ts` and `bun run build && bunx playwright test --config playwright.config.ts tests/e2e/how-it-works.spec.ts`, which remain valid if 006 turns `test:e2e` into a multi-config chain. Script tests validate contiguous 0:00–10:00 arithmetic, required values/labels/disclosures, both threshold branches, on-device approval, reconciliation reference, and a Playwright `window.print` stub/spy proving **Print / Save PDF** was invoked with the D4-appropriate Unbilled/Reconciled status. Explainer tests request both static URLs, inspect content/CTA, assert no role/reset chrome or forbidden claims, and check phone-width overflow.
- Manual: Brandon reads `docs/sales/demo-script.md` and the rendered explainer, taps the demo CTA on a physical phone, performs the complete scripted flow, observes the print action and expected Unbilled/Reconciled timing, and records device/browser, URL, elapsed time, pass/fail, and ambiguities in `verification.md`. Confirm no real customer data is entered. Before caller-isolated reset is deployed/verified, use only local/LAN or verified isolated preview and confirm the script's no-shared-hosted-reset warning is followed; a complete hosted prospect run remains pending under D6.
- Not verifiable here (and why): automated tests cannot prove spoken delivery fits ten minutes, physical-phone ergonomics, Brandon's comprehension, or the browser's native print dialog appearance. Those require AC9 owner evidence. Local/preview verification does not prove deployment to `field-closeout.vercel.app`; production remains separate.

## Risks and rollback
- A script can accidentally describe behavior that does not exist. Use existing accessible labels and execute the same path in Playwright; stop rather than changing app behavior to match prose.
- Fixed seed IDs/tokens would conflict with isolated demo sessions. Locate `JOB-2026-104`, Casey Vance, catalog names, and resulting URLs dynamically; never embed an approval token in docs or tests.
- Printing before reconciliation shows **Unbilled**, while printing afterward can show **Reconciled** and `INV-4821`. Implement only Brandon's D4 choice and assert the corresponding status copy.
- Static HTML can drift from app terminology. Keep it deliberately short, link only to the fictional demo, and test required disclosure/workflow phrases. A broad rewrite or public page API dependency is out of scope.
- Rollback is a revert of only the listed additive files and the one rewrite. Existing application data and routes require no restoration; if already deployed, Brandon separately gates the deployment rollback.
