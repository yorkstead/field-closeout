# Design: 003-homeowner-approval-and-closeout

## 1. Routes & API Contracts
- **Public Scoped Homeowner Routes (No Login Required):**
  - `GET /approve/[token]` — Renders customer-facing approval view (or read-only signed receipt if already decided; clear "Pending Office Review" holding state if `status === 'pending_office'`).
  - `POST /api/public/approve/[token]` — Validates decision (`approved | declined`), signer name, approval mode (`on_device | share_link`), and optional signature SVG/data payload; computes SHA-256 `snapshot_hash`; freezes record; appends `approval_events` row.
- **Office Manager Routes (`role` must be `office` or `owner`, scoped to `tenant_id`):**
  - `GET /office` — Office Closeout Queue with KPI cards, status filter tabs, copyable homeowner links, and inline actions.
  - `GET /office/change-orders/[id]/summary` — Print-optimized Closeout Summary packet.
  - `POST /api/office/change-orders/[id]/release` — Approves or adjusts prices on a `pending_office` change order and transitions it to `pending_homeowner`.
  - `POST /api/office/change-orders/[id]/reconcile` — Records `reconciled_invoice_ref` on an `approved` change order and transitions it to `reconciled`.
  - `GET /api/office/closeout-export.csv` — Streams RFC-4180 CSV of tenant-scoped change orders (properly escaping formula-injection prefixes `=`, `+`, `-`, `@`).

## 2. Tamper-Evident Snapshot Hash & Immutability
Create `src/lib/snapshot-hash.ts`:
```ts
// Canonical JSON payload hashed with Node/Bun crypto SHA-256:
// { changeOrderId, jobNumber, subtotalCents, items: [{ title, quantity, unitPriceCents, lineTotalCents }] }
```
**Immutability Guards:**
1. Application layer: Every mutation endpoint (`release`, `approve`, `reconcile`) checks current `status` inside a transaction (`SELECT ... FOR UPDATE` or conditional `WHERE status = ...` update returning row count) and rejects invalid transitions with HTTP `409 Conflict`.
2. Database layer: Add a PostgreSQL trigger in a new Drizzle migration preventing `UPDATE` or `DELETE` on `change_order_line_items` whenever the parent `change_orders.status IN ('approved', 'declined', 'reconciled')`, and preventing `UPDATE`/`DELETE` on `approval_events` (append-only).

## 3. Public Token Security Invariant
- `GET /approve/[token]` and `POST /api/public/approve/[token]` MUST select **only** the minimal customer-facing projection (`tenant.name`, `tenant.disclaimer_text`, `tenant.theme_config`, `job.job_number`, `job.service_address`, `change_order` scope/items/photo/status, and latest homeowner decision event if decided).
- Never expose internal user IDs, other jobs, internal notes, or office threshold settings on public endpoints.
- Unknown tokens return HTTP `404`.
