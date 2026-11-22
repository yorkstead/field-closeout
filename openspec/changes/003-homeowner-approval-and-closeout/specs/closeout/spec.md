# Delta Spec: closeout (003-homeowner-approval-and-closeout)

## ADDED Requirements

### Requirement: Dual-Mode Zero-Login Homeowner Approval
Homeowners MUST be able to review and approve or decline a `pending_homeowner` change order via `/approve/[token]` without logging in, supporting both `on_device` and `share_link` modes.

#### Scenario: Homeowner approves via shareable link
- **WHEN** a homeowner opens `/approve/[token]` for a `pending_homeowner` change order, enters their name, signs, and submits `approved`
- **THEN** the change order transitions to `approved`, an immutable `approval_events` row is appended with `approval_mode = 'share_link'`, `snapshot_total_cents`, and a 64-char SHA-256 `snapshot_hash`
- **AND** reloading `/approve/[token]` displays a read-only signed receipt and rejects any second decision with HTTP `409`.

#### Scenario: Homeowner cannot bypass office threshold review
- **WHEN** a client posts a decision to `/api/public/approve/[token]` while `status === 'pending_office'`
- **THEN** the server responds with HTTP `409` and performs no mutation.

### Requirement: Post-Decision Immutability
Once a change order is `approved`, `declined`, or `reconciled`, its line items and `approval_events` history MUST be immutable at both the service and PostgreSQL levels.

#### Scenario: Attempt to mutate line items after approval fails
- **WHEN** any code attempts to update or delete a row in `change_order_line_items` for an `approved` change order
- **THEN** PostgreSQL raises an exception and rolls back the transaction.

### Requirement: Office Closeout Queue, Threshold Release & Reconciliation
Office managers (`office` / `owner` roles only) MUST be able to review/release `pending_office` quotes, view recovered revenue KPIs, print/export Closeout Summaries, and mark `approved` change orders as `reconciled` with a manual invoice reference.

#### Scenario: Tech role blocked from office release and reconciliation
- **WHEN** a user with `role = 'tech'` calls `POST /api/office/change-orders/[id]/release` or `POST /api/office/change-orders/[id]/reconcile`
- **THEN** the server responds with HTTP `403`.

#### Scenario: Office releases over-threshold quote and reconciles after homeowner approval
- **WHEN** an `office` user approves/releases a `pending_office` change order
- **THEN** it transitions to `pending_homeowner` and logs `office_approved` (or `office_adjusted` if prices changed)
- **AND** once homeowner-approved, submitting `reconciled_invoice_ref = "INV-4821"` transitions status to `reconciled` and appends a `reconciled` event.
