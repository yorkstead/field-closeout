# Design: 002-field-capture-and-threshold

## 1. Routes & API Contracts
- **UI Routes:**
  - `GET /tech` — Active jobs list for the current tenant, showing customer name, job number, address, and count/status of change orders on each job.
  - `GET /tech/jobs/[jobId]/new-change-order` — Mobile-first (<30s) capture form with large tap targets.
  - `GET /tech/change-orders/[id]` — Confirmation & handoff screen (copy approval link, "Hand Phone to Homeowner" CTA, or "Awaiting Office Price Approval" notice).
- **API Endpoints:**
  - `GET /api/jobs` — Returns tenant-scoped active jobs + change order summaries.
  - `GET /api/catalog` — Returns active tenant-scoped `catalog_items`.
  - `POST /api/change-orders` — Creates a change order + line items + initial `approval_events` row inside a single DB transaction.

## 2. `POST /api/change-orders` Request & Server Authority
```ts
// Zod request schema (client NEVER sends subtotal_cents or status)
{
  jobId: string (uuid),
  notes?: string (max 1000),
  photoDataUrl?: string (validated data:image/(jpeg|png|webp);base64,... <= 350_000 chars),
  items: Array<{
    catalogItemId?: string (uuid),
    title: string (min 1, max 120),
    description?: string (max 500),
    quantity: number (int, min 1, max 99),
    unitPriceCents?: number (int, >= 0; required ONLY if catalogItemId is omitted)
  }> (min 1, max 20)
}
```
**Server-side pricing & routing rules:**
1. Verify `jobId` belongs to `session.tenantId`.
2. For every line item with `catalogItemId`, look up the row in `catalog_items` scoped to `session.tenantId` and use the **server's `unit_price_cents`** (ignoring any client-supplied price).
3. Compute `line_total_cents = quantity * unit_price_cents` and `subtotal_cents = sum(line_total_cents)` using `src/lib/money.ts`.
4. Compare `subtotal_cents` against `tenant.approval_threshold_cents`:
   - `<= threshold` → `status = 'pending_homeowner'`
   - `> threshold` → `status = 'pending_office'`
5. Generate `approval_token = crypto.randomBytes(32).toString('hex')`.
6. Insert `change_orders`, `change_order_line_items`, and `approval_events` (`event_type: 'submitted'`, `actor_type: 'tech'`, `snapshot_total_cents: subtotal_cents`) atomically in a Postgres transaction.

## 3. Built-in Synthetic Sample Photos
Place 3 lightweight synthetic SVG/WebP sample photos under `public/demo-photos/` (e.g., `shutoff-valve.svg`, `condenser-surge.svg`, `thermostat-wall.svg`) so a presenter can tap *"Use Sample Photo"* in 1 second without hunting for files on their laptop/phone.
