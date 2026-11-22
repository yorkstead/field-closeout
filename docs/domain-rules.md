# Domain Rules — Field Closeout

This document strictly separates **Confirmed Customer Facts** from **Proposed Demo Assumptions** and **Open Questions**. Never silently treat an assumption as a confirmed rule.

---

## 1. Confirmed Customer Facts (Evidence-Backed)
- *None yet.* This repository is currently a **100% fictional pre-discovery demo wedge** designed to run 10-minute walkthroughs with 3–15 truck local trades contractors (HVAC, plumbing, electrical, fencing) and land a first design partner.

---

## 2. Proposed Demo Assumptions (Provisional — Phase 1 Only)
These rules govern the fictional demo (*Northstar Mechanical & Plumbing*) and must remain tenant-configurable:

1. **Pre-Tax Flat-Rate Pricing:** All change-order line items and totals in Phase 1 are **pre-tax / flat-rate** amounts. Final sales tax is calculated in the contractor's existing invoicing tool (QuickBooks, Jobber, ServiceTitan, Housecall Pro).
2. **Change-Order Record Only (Compliance Boundary):** Every customer-facing approval screen and Closeout Summary displays a tenant-configurable disclaimer stating this is an operational change-order approval record only — **not payment processing, tax advice, or legal contract advice**.
3. **Field Pricing Authority & Office Threshold:**
   - Techs can select items from the tenant's flat-rate add-on catalog or add a custom line item.
   - Each tenant configures `approval_threshold_cents` (demo default: `50000` = **\$500.00**).
   - Change orders with `subtotal_cents <= approval_threshold_cents` route directly to `pending_homeowner`.
   - Change orders with `subtotal_cents > approval_threshold_cents` route to `pending_office` for office price review/adjustment before being released to the homeowner.
4. **Dual-Mode Homeowner Approval:** Homeowners can approve or decline either **on the tech's device** (sign-on-glass handoff) or via a **zero-login shareable link** (`/approve/[token]`). No real SMS/email is sent in Phase 1.
5. **Tamper-Evident Audit Trail:** Once approved or declined by the homeowner, line items and totals are frozen and an immutable `approval_events` record stores timestamp, signer name, approval mode, signature payload, `snapshot_total_cents`, and a SHA-256 `snapshot_hash`.
6. **Manual Reconciliation:** Office managers export/print the Closeout Summary and record the external invoice number (`reconciled_invoice_ref`) to transition an approved change order to `reconciled`.

---

## 3. Open Questions (Block Authoritative Production Outputs)
Must be answered in writing by a real design partner before graduating to `protected_pilot` (Phase 2):

1. **State/Local Legal Disclosures:** Do target states require specific home-improvement change-order disclosures, contractor license numbers, or written rescission notices on customer-facing approvals?
2. **Sales Tax Handling:** Do design partners want sales tax estimated at field approval (parts vs. labor split) or always excluded until final invoicing?
3. **Field Pricing Guardrails:** Will owners allow techs to enter custom free-text prices, or restrict techs strictly to locked flat-rate catalog items?
4. **Primary System of Record:** Which tool (Jobber, Housecall Pro, ServiceTitan, QuickBooks) is the primary billing system, and is printable PDF + CSV export sufficient for a paid pilot?
5. **Photo Retention & Privacy:** What retention window and homeowner consent language are required for job-site photos containing residential interiors?

---

## 4. Commercial & Pricing Policy (Confirmed Founder Model)
Yorkstead does **not** sell Field Closeout as a traditional monthly SaaS subscription. Core product IP remains 100% Yorkstead-owned; customers purchase a **perpetual single-shop license** (up to 15 trucks) with white-glove setup:

- **First-in-Trade Founding Partner (1 slot per trade — HVAC, Plumbing, Electrical, Fencing):** **\$1,250 – \$1,500 one-time** in exchange for helping dial in that trade's starter flat-rate catalog, terminology, disclosures, and a real-world proof point.
- **Standard Trade License (Shop #2+ in that trade):** **\$2,500 – \$3,500 one-time** (includes white-glove setup of company logo, flat-rate add-on menu, office approval threshold, and state disclosures).
- **Phase 3 FSM/QuickBooks Sync Add-On (future):** **+\$1,500 – \$2,500 one-time** when built.
- **Managed Hosting & Support (Unified Yorkstead Standard):**
  - **Year 1:** **Free** (included with license).
  - **Year 2+:** **\$400/year** (or **\$50/month** if preferred).
  - *Phase 2 SMS guardrail:* Include a fair-use SMS allowance (e.g., up to 500 SMS approval links/month) in hosting terms to protect margin on high-volume shops.

