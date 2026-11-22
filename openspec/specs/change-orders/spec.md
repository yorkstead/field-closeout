# Change Orders Specification

Status: Active (Phase 1 archived 2026-11-22 from `002-field-capture-and-threshold`).

## Purpose
Define field add-on capture, flat-rate catalog selection, integer-cents total calculation, server-side office-approval threshold routing, bounded photo validation, and append-only audit events.

## Requirements

### Requirement: Server-Side Integer-Cents Pricing & Catalog Authority
When a field tech creates a change order, the server MUST compute all line totals and subtotals in integer cents and use the database price for catalog items.

#### Scenario: Catalog item price cannot be spoofed by client
- **WHEN** a client submits a change order referencing a catalog item whose DB price is `18000` (\$180.00) with quantity `2`
- **THEN** the persisted `line_total_cents` is `36000` and `subtotal_cents` is `36000`, regardless of any price sent by the client.

### Requirement: Automatic Office-Approval Threshold Routing
The server MUST route new change orders based on `tenants.approval_threshold_cents` (default `50000` = \$500.00).

#### Scenario: Change order at or below threshold routes directly to homeowner
- **WHEN** a tech submits a change order with `subtotal_cents = 50000` for a tenant with threshold `50000`
- **THEN** the change order is saved with `status = 'pending_homeowner'`
- **AND** an `approval_events` row with `event_type = 'submitted'` is appended.

#### Scenario: Change order above threshold routes to office review
- **WHEN** a tech submits a change order with `subtotal_cents = 65000` for a tenant with threshold `50000`
- **THEN** the change order is saved with `status = 'pending_office'`
- **AND** the tech confirmation screen indicates it is awaiting office price approval before homeowner sign-off.

### Requirement: Bounded Photo Validation
Optional job-site photos MUST be MIME-validated (`image/jpeg`, `image/png`, `image/webp`, or allowlisted built-in `/demo-photos/*` path) and size-capped at ≤350KB encoded payload.

#### Scenario: Oversized or invalid photo payload is rejected
- **WHEN** a client submits a `photoDataUrl` exceeding 350KB or with a non-image MIME type (e.g., `text/html`)
- **THEN** `POST /api/change-orders` responds with HTTP `400` and persists nothing.
