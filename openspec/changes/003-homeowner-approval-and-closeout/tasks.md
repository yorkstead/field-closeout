# Tasks: 003-homeowner-approval-and-closeout

## Database Immutability & Audit Helpers
- [x] Add Drizzle SQL migration creating PostgreSQL triggers enforcing: (1) immutability of `change_order_line_items` once parent `change_orders.status IN ('approved', 'declined', 'reconciled')`, and (2) append-only `approval_events` (no `UPDATE`/`DELETE`).
- [x] Implement `src/lib/snapshot-hash.ts` (deterministic SHA-256 hash of canonical line items + total) with unit tests.
- [x] Implement `src/lib/csv.ts` (RFC-4180 CSV serializer with formula-injection protection) with unit tests.

## Homeowner Approval (Zero-Login)
- [x] Implement `POST /api/public/approve/[token]` with single-decision atomic transition (`pending_homeowner` → `approved` | `declined`), `snapshot_hash` generation, and strict minimal data projection.
- [x] Build `/approve/[token]` mobile-friendly approval page with signature pad component (touch + mouse draw-to-sign + typed name), `on_device` vs `share_link` mode handling, compliance disclaimer, and read-only signed receipt state.

## Office Closeout Queue & Reconciliation
- [x] Implement `POST /api/office/change-orders/[id]/release` (`office`/`owner` role check, optional line-item price adjustment with server-side integer-cents recomputation, transition `pending_office` → `pending_homeowner`).
- [x] Implement `POST /api/office/change-orders/[id]/reconcile` (`office`/`owner` role check, transition `approved` → `reconciled` with required `reconciled_invoice_ref`).
- [x] Implement `GET /api/office/closeout-export.csv` (`office`/`owner` role check, tenant-scoped).
- [x] Build `/office` Closeout Queue UI (KPI cards for Recovered Revenue / Unbilled Approved / Pending Office, status filters, inline over-threshold review modal, copyable homeowner link, and Mark Reconciled modal).
- [x] Build `/office/change-orders/[id]/summary` print-optimized Closeout Summary packet with **Print / Save PDF** button.

## Verification
- [x] Add integration/unit test verifying PostgreSQL trigger blocks mutation of approved `change_order_line_items` and `approval_events`.
- [x] Add full end-to-end Playwright walkthrough test: Tech creates under-threshold add-on → Homeowner approves via `/approve/[token]` → Office reconciles to `INV-4821` → Closeout Summary renders signed hash & reconciled invoice ref.
- [x] Add Playwright test verifying over-threshold flow: Tech creates >$500 add-on → Office releases → Homeowner approves.
- [x] Run `bun run verify` and confirm all checks pass.
- [x] Update `docs/handoffs/CURRENT.md` and open PR targeting `next`.
