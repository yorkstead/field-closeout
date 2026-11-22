import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import {
  changeOrders,
  jobs,
  changeOrderLineItems,
  users,
  tenants,
  approvalEvents,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getServerSession } from "@/lib/session";
import { CANONICAL_DEMO_TENANT, resolveTenantProfile } from "@/lib/tenant-theme";
import { formatCents } from "@/lib/money";
import { PrintButton } from "@/components/PrintButton";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck,
  Hash,
  MapPin,
  Calendar,
  Building2,
  Receipt,
  ShieldCheck,
} from "lucide-react";

export default async function CloseoutSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session || (session.role !== "office" && session.role !== "owner")) {
    redirect("/tech");
  }
  const tenantId = session.tenantId || CANONICAL_DEMO_TENANT.id;

  // 1. Fetch Change Order with Job and Creator
  const coRows = await db
    .select({
      id: changeOrders.id,
      status: changeOrders.status,
      subtotalCents: changeOrders.subtotalCents,
      notes: changeOrders.notes,
      photoDataUrl: changeOrders.photoDataUrl,
      approvalToken: changeOrders.approvalToken,
      reconciledInvoiceRef: changeOrders.reconciledInvoiceRef,
      reconciledAt: changeOrders.reconciledAt,
      createdAt: changeOrders.createdAt,
      jobId: jobs.id,
      jobNumber: jobs.jobNumber,
      customerName: jobs.customerName,
      serviceAddress: jobs.serviceAddress,
      techName: users.displayName,
    })
    .from(changeOrders)
    .innerJoin(jobs, eq(changeOrders.jobId, jobs.id))
    .innerJoin(users, eq(changeOrders.createdByUserId, users.id))
    .where(and(eq(changeOrders.id, id), eq(changeOrders.tenantId, tenantId)))
    .limit(1);

  if (coRows.length === 0) {
    notFound();
  }
  const co = coRows[0];

  // 2. Fetch Line Items
  const lineItems = await db
    .select({
      id: changeOrderLineItems.id,
      title: changeOrderLineItems.title,
      description: changeOrderLineItems.description,
      quantity: changeOrderLineItems.quantity,
      unitPriceCents: changeOrderLineItems.unitPriceCents,
      lineTotalCents: changeOrderLineItems.lineTotalCents,
    })
    .from(changeOrderLineItems)
    .where(eq(changeOrderLineItems.changeOrderId, co.id));

  // 3. Fetch Tenant Config
  let tenant = CANONICAL_DEMO_TENANT;
  try {
    const tenantRows = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (tenantRows.length > 0) {
      tenant = resolveTenantProfile(tenantRows[0]);
    }
  } catch (err) {
    console.warn("Could not query tenant in summary page:", err);
  }

  // 4. Fetch Homeowner approval event
  const events = await db
    .select({
      eventType: approvalEvents.eventType,
      actorName: approvalEvents.actorName,
      approvalMode: approvalEvents.approvalMode,
      signaturePayload: approvalEvents.signaturePayload,
      snapshotHash: approvalEvents.snapshotHash,
      createdAt: approvalEvents.createdAt,
    })
    .from(approvalEvents)
    .where(eq(approvalEvents.changeOrderId, co.id))
    .orderBy(desc(approvalEvents.createdAt));

  const homeownerApprovalEvent = events.find(
    (e) => e.eventType === "homeowner_approved"
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 print:m-0 print:max-w-none">
      {/* Top action bar (hidden in print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/office"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Closeout Queue
        </Link>

        <PrintButton />
      </div>

      {/* Main Printable Summary Packet */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Header: Company & Closeout Packet Banner */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-md bg-sky-600 text-white font-bold text-xs">FC</span>
              <span className="font-extrabold text-xl text-slate-900 tracking-tight">
                {tenant.name}
              </span>
            </div>
            <p className="text-xs text-slate-500">{tenant.tradeType}</p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 text-white">
              Closeout Summary Packet
            </span>
            <div className="text-xs text-slate-500">Record ID: {co.id.slice(0, 8)}</div>
          </div>
        </div>

        {/* Job & Customer Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <div>
            <div className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
              Customer & Location
            </div>
            <h2 className="text-sm font-bold text-slate-900 mt-0.5">{co.customerName}</h2>
            <div className="text-slate-600 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {co.serviceAddress}
            </div>
          </div>

          <div className="sm:text-right">
            <div className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
              Work Order & Tech
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">Job #{co.jobNumber}</div>
            <div className="text-slate-600 mt-0.5">Captured by {co.techName}</div>
          </div>
        </div>

        {/* Scope Breakdown */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Approved Add-On Scope & Minor Units
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {lineItems.map((item) => (
              <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{item.title}</div>
                  {item.description && (
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Qty: {item.quantity} × {formatCents(item.unitPriceCents)}
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {formatCents(item.lineTotalCents)}
                </div>
              </div>
            ))}

            <div className="p-4 bg-slate-50 flex items-center justify-between font-bold text-sm">
              <span className="text-slate-700">Pre-Tax Approved Subtotal</span>
              <span className="text-slate-900 text-lg">{formatCents(co.subtotalCents)}</span>
            </div>
          </div>
        </div>

        {/* Photo Documentation (if present) */}
        {co.photoDataUrl && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Job-Site Photo Attachment
            </h3>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex justify-center p-2">
              <img
                src={co.photoDataUrl}
                alt="Job-site documentation"
                className="max-h-56 object-contain"
              />
            </div>
          </div>
        )}

        {/* Homeowner Authorization & Tamper-Evident Hash */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Homeowner Electronic Authorization
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
            <div>
              <div className="text-slate-500">Signer Name:</div>
              <div className="font-bold text-slate-900 mt-0.5">
                {homeownerApprovalEvent?.actorName || co.customerName}
              </div>
              <div className="text-slate-500 mt-2">Approval Mode:</div>
              <div className="font-medium text-slate-800 capitalize mt-0.5">
                {homeownerApprovalEvent?.approvalMode === "on_device"
                  ? "On-Device Sign-on-Glass"
                  : "Remote Shareable Link"}
              </div>
            </div>

            {homeownerApprovalEvent?.signaturePayload && (
              <div className="sm:text-right">
                <div className="text-slate-500 mb-1">Signature On File:</div>
                <div className="inline-block bg-white p-2 rounded-lg border border-slate-200">
                  <img
                    src={homeownerApprovalEvent.signaturePayload}
                    alt="Signature"
                    className="max-h-12 object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cryptographic SHA-256 Snapshot Hash */}
          {homeownerApprovalEvent?.snapshotHash && (
            <div className="pt-2 border-t border-slate-200 text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1">
                <Hash className="w-3 h-3 text-slate-400" />
                Tamper-Evident SHA-256 Snapshot Hash
              </div>
              <div
                data-testid="summary-snapshot-hash"
                className="font-mono text-[10px] p-2 bg-white rounded-lg border border-slate-200 select-all break-all text-slate-700"
              >
                {homeownerApprovalEvent.snapshotHash}
              </div>
            </div>
          )}
        </div>

        {/* Invoice Reconciliation Status */}
        <div className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-slate-500" />
              Final Invoicing Reconciliation
            </div>
            {co.reconciledInvoiceRef ? (
              <div className="mt-1">
                Reconciled to Invoice:{" "}
                <strong
                  data-testid="summary-reconciled-invoice-ref"
                  className="text-slate-900 font-mono text-sm font-bold"
                >
                  {co.reconciledInvoiceRef}
                </strong>
                {co.reconciledAt && (
                  <span className="text-slate-500 text-[11px] block sm:inline sm:ml-2">
                    on {new Date(co.reconciledAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-1 text-amber-700 font-medium">
                Pending Reconciliation — Approved add-on has not yet been attached to an invoice.
              </div>
            )}
          </div>

          <div>
            <span
              className={`inline-block px-3 py-1 rounded-md text-xs font-bold ${
                co.reconciledInvoiceRef
                  ? "bg-slate-900 text-white"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {co.reconciledInvoiceRef ? "Reconciled" : "Unbilled"}
            </span>
          </div>
        </div>

        {/* Legal Disclaimer Footer */}
        <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-400 flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
          <span>{tenant.disclaimerText}</span>
        </div>
      </div>
    </div>
  );
}
