# Implementation plan: Isolated demo sessions and locked-down reset

**Spec:** [spec.md](./spec.md)

## Approach
Implement recommended Option A only after Brandon approves the spec and resolves every Open decision. Keep `local` on the canonical shared tenant with stable test IDs/data, but make its approval tokens random and update token-coupled unit tests to look them up; add per-visitor behavior only to `hosted_demo`; keep `protected_pilot` hard-disabled.

1. **Add an additive session mapping.** Create `demo_sessions` with generated UUID, unique SHA-256 token hash, unique `tenant_id`, `created_at`, and `expires_at`, plus unique token and expiry indexes. Store no raw bearer token. A session row explicitly identifies a hosted-demo-owned tenant, so cleanup never infers ownership from a Northstar name/slug. Add ordered migration `0003` without changing existing tenant/business rows.
2. **Parameterize the fictional fixture.** Extract reusable provisioning/reset/deletion logic from the CLI seed. New visitor copies generate fresh UUID/FK mappings, unique slugs, per-tenant Marcus/Dana users, random 32-byte approval tokens, and snapshot hashes computed through the existing `computeSnapshotHash` helper using the remapped change-order ID, job number, integer-cent subtotal, and canonicalized line items (not the legacy fixture-only hash formula). The local CLI still resets only the canonical local fixture with stable IDs/data but newly random approval tokens. Hosted reset preserves the visitor's session/tenant/users/role but transactionally replaces business rows and approval tokens. All deletion of decided rows/events uses transaction-local `app.demo_reset`; never disable triggers globally.
3. **Resolve visitors on the server.** Add an opaque `fc_demo_session` credential alongside the existing role preference. Use a 256-bit random raw value only in the `Secure`, `HttpOnly`, `SameSite=Lax`, path-`/` cookie and its SHA-256 hash in Postgres. `src/lib/session.ts` resolves the visitor's tenant-specific user; role remains a UI preference, never tenant authority. Absolute seven-day expiry and batch-25 lazy cleanup live in shared server code, not new environment/secrets.
4. **Bootstrap explicitly.** Add a same-origin bootstrap route handler because server components cannot persist a new cookie. A new/expired internal hosted visit redirects to bootstrap; bootstrap creates the mapping/copy, sets the cookie, and redirects only to an allowlisted internal destination. APIs reject missing/invalid credentials. Missing tenant/session rows never fall back to canonical data. `/approve/*`, health, static assets, and `protected_pilot` never bootstrap.
5. **Remove hosted canonical fallbacks and isolate the public shell.** Update root/tech/office pages and role/reset endpoints. Add middleware that overwrites an internal public-approval request header only for `/approve/*`; the root layout uses that server signal to omit contractor session resolution/DemoHeader entirely, preventing unrelated session props in HTML/RSC. Update the approval page so cookie-free and unrelated-cookie viewers receive no internal links; an on-device return-to-tech link renders only when the server-resolved session tenant matches the token order's tenant. Public token lookup/decision remains token-only. Apply shell omission and same-tenant-only link behavior only in `hosted_demo`; retain the existing local and `protected_pilot` root/approval rendering paths exactly and add a protected-pilot regression. Existing tenant-scoped business APIs/services should need tests, not rewrites.
6. **Clean up lazily and test the real runtime.** During first-visit bootstrap only, delete at most 25 logically expired demo-owned tenants in bounded transactions; reset performs no cleanup. Expiry is enforced even when deletion is overdue. Add a separate hosted-demo Playwright config on port 3001 and include it in `test:e2e`, while the existing local suite remains on port 3000. Full verify then covers existing local behavior and two-context hosted isolation.

Do not run legacy seed against hosted data. D6 requires an explicit owner rollout decision for the existing canonical tenant and old approval links; D10 requires an explicit rollback posture. Production migration/deploy/cleanup remain separate Brandon gates.

## Files and boundaries
Implementers may touch only the files listed here; anything else needs a plan update first.

| Area / file | Change | Risk |
|---|---|---|
| `src/db/schema.ts` | Add typed `demo_sessions` mapping/lifecycle table and needed relations | High: tenant ownership/security |
| `drizzle/0003_demo_sessions.sql` | New ordered additive migration; no drops/backfill of business rows | High: hosted migration owner-gated |
| `drizzle/meta/_journal.json` | Hand-authored ordered journal entry following the existing custom 0001/0002 migrations; no fabricated snapshot chain | Medium |
| `src/db/migrate-check.ts` | Require the new session table and expected shape when migrated | Medium |
| `src/db/seed.ts` | Preserve canonical local CLI behavior; share Northstar fixture without executing CLI reset on import | High: destructive if hosted |
| `src/db/demo-tenants.ts` | New transactional visitor provisioning, scoped reset, owned deletion, bounded expiry cleanup using demo-reset GUC | High: cross-tenant/immutability |
| `src/lib/demo-session.ts` | New cookie/token hashing, expiry constants, visitor lookup, bootstrap destination allowlist, server-only helpers | High: bearer credential/tenant authority |
| `src/lib/session.ts` | Resolve hosted visitor tenant/users; preserve local canonical users and protected-pilot null | High |
| `src/lib/tenant-theme.ts` | Separate Northstar defaults/template identity from canonical fallback; prevent hosted shared fallback | High |
| `src/app/api/demo/bootstrap/route.ts` | New first/expired-visit provisioning + cookie-writing + allowlisted redirect; lazy cleanup entry | High |
| `src/app/api/demo/session/route.ts` | Preserve visitor across role switches; return visitor tenant's tech/office user; retain pilot 403 | High |
| `src/app/api/demo/reset/route.ts` | Reset only resolved caller; retain local compatibility/pilot 403; reject invalid hosted authority | High |
| `src/middleware.ts` | New path-only, no-DB middleware that overwrites a server-only public-approval request header; never issues/provisions demo cookies | High: public shell data boundary |
| `src/app/layout.tsx` | Remove canonical hosted session/branding fallback; omit contractor session/header for server-marked approval requests only in hosted_demo; preserve local/pilot rendering and safe generic defaults | High |
| `src/app/page.tsx` | Route missing/expired hosted visitors through bootstrap; preserve local role redirect | Medium |
| `src/app/tech/page.tsx` | Require visitor tenant for hosted job/catalog/order reads; remove canonical query | High |
| `src/app/tech/jobs/[jobId]/new-change-order/page.tsx` | Remove null-session/config canonical fallbacks; bootstrap or not-found without cross-tenant reads | High |
| `src/app/tech/change-orders/[id]/page.tsx` | Same tenant-safe handoff/detail behavior | High |
| `src/app/office/page.tsx` | Remove null-session and missing-tenant canonical fallbacks; scope queue to visitor | High |
| `src/app/office/change-orders/[id]/summary/page.tsx` | Remove redundant canonical fallbacks; retain office/owner checks | High |
| `src/components/DemoHeader.tsx` | Handle bootstrap/session/reset state; root server shell omits it entirely on approval requests | Medium |
| `src/app/approve/[token]/page.tsx` | Keep token-derived content; omit internal links for cookie-free/unrelated viewers and render on-device return only for matching tenant | High: token/public isolation |
| `tests/unit/demo-isolation.test.ts` | New provisioning/ID/token/hash, scoped-reset, cross-tenant, expiry/cleanup, bootstrap/runtime/public-route tests | High |
| `tests/unit/api-routes.test.ts` | Minimal compatibility updates for random seed-token lookup and request-aware demo handlers; preserve scenarios | High |
| `tests/e2e/demo-isolation.spec.ts` | New two-browser isolation/reset/role/CSV/summary/cross-ID/public-token/expiry scenarios | High |
| `playwright.config.ts` | Exclude hosted-only isolation spec from existing local project; retain local defaults | Medium |
| `playwright.hosted-demo.config.ts` | New one-worker hosted-demo project/server on port 3001 using local synthetic Postgres | Medium |
| `package.json` | Extend existing `test:e2e` to run local and hosted-demo configs; no dependencies/other script changes | Medium |
| `openspec/specs/runtime-boundaries/spec.md` | Update living hosted isolation/reset/expiry/public-token behavior and unchanged pilot/local boundaries | Medium |
| `docs/adr/0001-stack-and-runtime-boundaries.md` | Clarify shared application hosting no longer means shared visitor data; link to 006 rather than rewrite history | Low |
| `README.md` | Only if its setup/verify documentation exists when 006 lands, resynchronize final test:e2e commands and ports 3000/3001; otherwise leave the one-line README for 008 | Medium: docs must match final test chain |
| `specs/006-isolated-demo-sessions/tasks.md` | Tick completed tasks and maintain handoff state | Low |
| `specs/006-isolated-demo-sessions/verification.md` | New exact output, migration/upgrade/rollback rehearsal, two-context evidence, unverified hosted items | Low |
| `docs/handoffs/CURRENT.md` | Dated implementation/rollout/rollback decision state | Medium |
| `specs/INDEX.md` | Synchronize spec 006 status | Low |

Explicitly **unchanged unless a failing regression first triggers a plan update:** `src/lib/change-orders.ts`, session-scoped catalog/jobs/change-order/office API routes, the public decision API, signature/capture/office components, other existing local unit tests and existing local e2e tests, runtime-mode parser, CI/Vercel settings, and archived OpenSpec history. No `.env` key, secret, dependency, cron/workflow, or external service is added.

## Data and migrations
- Schema change: additive hand-authored `drizzle/0003_demo_sessions.sql` after `0002_demo_reset_guc.sql`, with a matching ordered `_journal.json` entry following the repository's custom 0001/0002 precedent (which also has no snapshots). Do not claim ordinary incremental generation from absent 0001/0002 snapshots or fabricate a snapshot chain. Validate the hand-authored SQL/journal on both fresh and 0002-upgraded disposable local databases with `bun run db:migrate` and `bun run db:migrate:check`; apply revised seed before tests. If Drizzle metadata cannot be made internally consistent by this procedure, stop for a plan update. No legacy canonical backfill is implied.
- Later owner-gated hosted order: pause hosted access → confirm actual hosted data and back it up → apply additive migration → execute the D6-approved legacy predictable-token rotation/invalidation or deletion → deploy compatible visitor code → verify fresh isolation/public tokens → only then unpause. No interval with publicly reachable known `token_demo_*` URLs is allowed. Never run current canonical seed as an upgrade step; implementation itself authorizes no hosted mutation.
- Reset/cleanup deletion: transaction-local `SELECT set_config('app.demo_reset', 'on', true)` and dependency-safe tenant predicates. Cover each path with two tenants to prove sibling rows/events untouched.
- Rollback: forward-only repository; no down command. In a disposable local database, rehearse the 0003 upgrade, then run the **prior revision's** `bun run db:seed` before prior-code `bun run verify` so its hardcoded seed tokens are restored. Document that prior verification deliberately deletes/reseeds the canonical demo fixture; require only non-demo sentinels and unexpired visitor mappings/data to survive, not byte-identical canonical fixture rows. Restore current seed before current-revision checks. Leave additive table/mappings in place. Prior code resumes shared behavior, so production rollback follows approved D10 (recommended pause). No implicit table drop/data deletion/destructive down migration; restore needs separate owner-approved backup/restore.

## Phases and gates
1. **Spec gate:** Brandon resolves D1–D10 plus retention/abuse questions and approves. Option B, fixed scheduler, or route-group public shell requires a revised plan.
2. **Migration slice:** schema/check plus hand-authored 0003/journal, validated fresh and as an upgrade.
3. **Fixture then lifecycle slices:** parameterized provisioning/hash generation first, then caller-scoped reset and expiry cleanup.
4. **Visitor authority slices:** opaque cookie/session lookup, then bootstrap and role/reset routes. No intermediate deploy.
5. **Rendering slices:** internal SSR fallback removal, then server-side public approval shell and same-tenant-only return link.
6. **Browser slices:** hosted Playwright infrastructure/core isolation first, then concurrent reset/multiple tabs/public token/expiry/runtime cases; no shared request cookie jars.
7. **Upgrade/rollback and living docs:** disposable-local prior-seed/prior-code rehearsal; document D6/D10 and no-traffic cleanup limitation.
8. **Close-out/production gates:** full verify and verification record, then draft PR. Every individual task also runs current-revision `bun run verify` and updates verification/tasks/CURRENT before it is considered complete. Brandon separately approves merge, hosted migration, legacy-data action, deployment, and re-enable/rollback.

## Verification strategy
- Automated: every task runs current-revision `bun run verify` after local migrate/seed and records output in `verification.md`; supplement with focused `bun test tests/unit/demo-isolation.test.ts`, `bunx playwright test --config playwright.hosted-demo.config.ts`, `git diff --check`, and allowed-path review. Full e2e runs existing local tests on 3000 and hosted isolation on 3001 with one worker each.
- Unit/integration: two unique baselines (6 catalog/4 jobs/3 orders), no UUID/slug/token collisions, and canonical plus cloned receipt hashes verified through `verifySnapshotHash` against remapped ID/job number/subtotal/line items; reload/role user stability, A/B scoped reads/mutations/CSV, reset rollback, selector rejection without B lookup, expired credential rejection/fresh bootstrap, batch-25 cleanup with decided rows and non-target sentinels, pilot 403/no provisioning, token-only public approve/decline/idempotency/reset invalidation.
- Browser: two clean contexts never list/view/export each other's records; concurrent A/B resets affect only their own tenant; same-context multiple tabs and role/reload preserve tenant; direct internal first visit never flashes canonical data; cross-tenant IDs fail closed; old A token dies/new A token works after reset while B token survives. Exercise cookie-free, unrelated-cookie, and same-tenant-on-device approval contexts: no unrelated session props/internal links, no provisioning, and only the matching on-device context gets the return-to-tech link.
- Migration/rollback: hand-author 0003/journal and apply to fresh and 0002 disposable local databases. For prior-code compatibility, run the prior revision's seed after upgrade and before prior-code verify; explicitly expect canonical demo deletion/reseeding while non-demo sentinels and unexpired visitor mappings/data survive. Run current-revision verify separately and restore current seed before later checks. Never rehearse against hosted Postgres.
- Manual/not verifiable here: actual Vercel cookie behavior, parallel prospect calls, production legacy-token disposition, cleanup during no traffic, and production rollback require Brandon's owner-gated evidence. Lazy cleanup is not guaranteed wall-clock deletion when there is no first-visit traffic.

## Risks and rollback
- **First-request/shared fallback:** server components cannot persist cookie creation and canonical fallbacks could leak. Use explicit bootstrap, allowlisted redirects, direct-first-URL e2e; fail closed.
- **Fixture collisions/tamper evidence:** fixed IDs/slugs/tokens and ID-based hashes cannot be copied verbatim. Generate/remap everything and test uniqueness/hash behavior.
- **Cross-tenant deletion:** reset/cleanup touches immutable rows. Use server-resolved ownership, transaction-local GUC, bounded tenant predicates, two-tenant sentinels; reset never invokes cleanup.
- **Public approval regression:** contractor cookies must not become token authority or leak through RSC. Omit contractor session resolution server-side, condition internal links on tenant match, and test cookie-free/unrelated/same-tenant contexts plus public decisions.
- **Legacy hosted records:** no visitor attribution/backfill is possible. Do not auto-seed/delete; follow D6 and owner backup/rollout approval.
- **Unbounded anonymous provisioning:** public visitors create rows before expiry. Lazy cleanup alone may be insufficient; implement the approved abuse answer or stop for plan update rather than adding an unreliable limiter/service.
- **Rollback reopens sharing:** additive schema is compatible but old code is not isolated. Prefer D10 pause, retain mappings, never claim code-only rollback preserves isolation.
