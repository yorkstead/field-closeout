# Proposal: 003-homeowner-approval-and-closeout

- **Phase:** Phase 1 — Half-Day Demo Wedge
- **Target Branch:** `next` (PR from `feat/003-homeowner-approval-and-closeout`)
- **Depends On:** `002-field-capture-and-threshold`

## Why
Complete the end-to-end 10-minute demo loop: homeowners approve or decline mid-job add-ons with zero login (either on the tech's device or via a shareable link in a second tab), creating a tamper-evident audit record, while the Office Manager clears over-threshold quotes, tracks **Recovered Add-On Revenue**, prints/exports a clean **Closeout Summary**, and reconciles approved add-ons to the final invoice.

## Scope (In)
- **Dual-Mode Zero-Login Homeowner Approval (`/approve/[token]`):**
  - Supports `?mode=on_device` (handed from tech's phone/tablet with a "Return to Tech View" button after signing) and default `share_link` (remote homeowner opening copied URL in a separate tab).
  - Displays tenant branding, job number/address, itemized scope, pre-tax total, optional photo, and the tenant's **Change-Order Record Only** disclaimer.
  - Captures typed signer name + simple canvas draw-to-sign (or typed acceptance fallback) + Approve / Decline action.
  - Idempotent single-decision lock: once `approved` or `declined`, line items and totals are frozen, a SHA-256 `snapshot_hash` is persisted in `approval_events`, and subsequent visits render a read-only receipt.
  - Rejects homeowner decisions while status is still `pending_office` (cannot bypass office threshold review).
- **Office Closeout Queue (`/office`):**
  - Top KPI cards: **Recovered Add-On Revenue (Approved + Reconciled)**, **Unbilled Approved Add-Ons (Action Needed)**, and **Pending Office Review**.
  - Status filter tabs (`All`, `Pending Office`, `Pending Homeowner`, `Approved — Unbilled`, `Declined`, `Reconciled`).
  - **Over-Threshold Office Review:** For `pending_office` change orders, office manager can approve as-is or adjust line-item prices (server recomputes integer-cents subtotal, logs `office_approved` or `office_adjusted` event, and transitions to `pending_homeowner` so the approval link becomes active).
  - **Reconciliation Action:** For `approved` change orders, office manager enters `Final Invoice #` (e.g., `INV-4821`) and clicks **Mark Reconciled**, transitioning to `reconciled` and appending a `reconciled` audit event.
- **Printable / Exportable Closeout Summary (`/office/change-orders/[id]/summary`):**
  - Clean print-optimized (`@media print`) closeout packet showing company branding, job info, itemized add-ons, photo, homeowner approval timestamp/mode/signature, SHA-256 verification hash, reconciliation status, and disclaimer, plus one-click **Print / Save PDF** and **Export CSV** of the Office Closeout Queue.

## Non-Goals (Out)
- Live SMS/email sending (Twilio/SendGrid).
- Live payment collection or sales tax calculation.
- Live QuickBooks/Jobber/ServiceTitan API write-backs.
