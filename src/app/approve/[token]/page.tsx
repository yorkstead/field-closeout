import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  changeOrders,
  jobs,
  changeOrderLineItems,
  tenants,
  approvalEvents,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { formatCents } from "@/lib/money";
import { resolveTenantProfile } from "@/lib/tenant-theme";
import { SignaturePadForm } from "@/components/SignaturePadForm";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  MapPin,
  Briefcase,
  Hash,
  ArrowLeft,
  Smartphone,
} from "lucide-react";

export default async function HomeownerApprovalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { token } = await params;
  const { mode } = await searchParams;
  const isOnDevice = mode === "on_device";

  // 1. Fetch Change Order with minimal customer-facing projection
  const coRows = await db
    .select({
      id: changeOrders.id,
      tenantId: changeOrders.tenantId,
      status: changeOrders.status,
      subtotalCents: changeOrders.subtotalCents,
      notes: changeOrders.notes,
      photoDataUrl: changeOrders.photoDataUrl,
      createdAt: changeOrders.createdAt,
      jobId: changeOrders.jobId,
    })
    .from(changeOrders)
    .where(eq(changeOrders.approvalToken, token))
    .limit(1);

  if (coRows.length === 0) {
    notFound();
  }
  const co = coRows[0];

  // 2. Fetch Job details (public projection: customerName, jobNumber, serviceAddress)
  const jobRows = await db
    .select({
      jobNumber: jobs.jobNumber,
      customerName: jobs.customerName,
      serviceAddress: jobs.serviceAddress,
    })
    .from(jobs)
    .where(eq(jobs.id, co.jobId))
    .limit(1);

  const job = jobRows[0] || {
    jobNumber: "JOB-UNKNOWN",
    customerName: "Valued Customer",
    serviceAddress: "Service Location",
  };

  // 3. Fetch Tenant branding & disclaimer
  const tenantRows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, co.tenantId))
    .limit(1);

  const tenant = resolveTenantProfile(tenantRows[0]);

  // 4. Fetch Line Items
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

  // 5. If decided, fetch the homeowner decision event
  let decisionEvent: {
    eventType: string;
    actorName: string;
    approvalMode: string | null;
    signaturePayload: string | null;
    snapshotHash: string | null;
    createdAt: Date;
  } | null = null;

  if (co.status === "approved" || co.status === "declined" || co.status === "reconciled") {
    const eventRows = await db
      .select({
        eventType: approvalEvents.eventType,
        actorName: approvalEvents.actorName,
        approvalMode: approvalEvents.approvalMode,
        signaturePayload: approvalEvents.signaturePayload,
        snapshotHash: approvalEvents.snapshotHash,
        createdAt: approvalEvents.createdAt,
      })
      .from(approvalEvents)
      .where(
        and(
          eq(approvalEvents.changeOrderId, co.id),
          eq(approvalEvents.actorType, "homeowner")
        )
      )
      .orderBy(desc(approvalEvents.createdAt))
      .limit(1);

    if (eventRows.length > 0) {
      decisionEvent = eventRows[0];
    }
  }

  const isPendingOffice = co.status === "pending_office";
  const isPendingHomeowner = co.status === "pending_homeowner";
  const isApproved = co.status === "approved" || co.status === "reconciled";
  const isDeclined = co.status === "declined";

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-12">
      {/* On-device top bar */}
      {isOnDevice && (
        <div className="flex items-center justify-between text-xs text-slate-500 pb-2">
          <Link
            href="/tech"
            data-testid="return-to-tech-button"
            className="font-semibold text-sky-600 hover:text-sky-800 transition flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Tech View
          </Link>
          <span className="flex items-center gap-1 text-slate-400">
            <Smartphone className="w-3 h-3" />
            Device Handoff Mode
          </span>
        </div>
      )}

      {/* Tenant Branding Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center space-y-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-600 text-white font-bold text-xl mb-2 shadow-inner">
          FC
        </div>
        <h1 className="text-xl font-bold text-slate-900">{tenant.name}</h1>
        <div className="text-xs text-slate-500 font-medium">{tenant.tradeType}</div>
      </div>

      {/* Main Approval Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        {/* Status / Holding Banner */}
        {isPendingOffice && (
          <div
            data-testid="homeowner-pending-office-banner"
            className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 text-center"
          >
            <div className="inline-flex p-2 rounded-full bg-amber-100 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-base">Estimate Under Office Review</h2>
            <p className="text-xs text-amber-800">
              This mid-job add-on estimate is currently undergoing office confirmation before customer approval.
              Please check back shortly or check in with your field technician.
            </p>
          </div>
        )}

        {/* Read-Only Signed Receipt */}
        {(isApproved || isDeclined) && (
          <div
            data-testid="decision-receipt-card"
            className={`p-5 rounded-2xl border text-center space-y-3 ${
              isApproved
                ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <div
              className={`inline-flex p-2.5 rounded-full ${
                isApproved ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
              }`}
            >
              {isApproved ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            </div>

            <div>
              <h2 className="font-bold text-lg">
                {isApproved ? "Change Order Approved" : "Change Order Declined"}
              </h2>
              <p className="text-xs mt-1 opacity-80">
                {isApproved
                  ? `Authorized by ${decisionEvent?.actorName || job.customerName} on ${decisionEvent?.createdAt ? new Date(decisionEvent.createdAt).toLocaleDateString() : "file"}.`
                  : `Declined by ${decisionEvent?.actorName || job.customerName}.`}
              </p>
            </div>

            {decisionEvent?.signaturePayload && (
              <div className="pt-2">
                <div className="text-[10px] uppercase font-bold text-emerald-800/70 tracking-wider mb-1">
                  Electronic Signature
                </div>
                <div className="inline-block bg-white p-2 rounded-xl border border-emerald-200 shadow-inner">
                  <img
                    src={decisionEvent.signaturePayload}
                    alt="Homeowner Signature"
                    className="max-h-16 object-contain"
                  />
                </div>
              </div>
            )}

            {decisionEvent?.snapshotHash && (
              <div className="pt-2 border-t border-emerald-200/60 text-left">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80 flex items-center gap-1 mb-1">
                  <Hash className="w-3 h-3" />
                  SHA-256 Audit Verification Hash
                </div>
                <div
                  data-testid="snapshot-hash-display"
                  className="font-mono text-[11px] p-2 bg-white/80 rounded-lg border border-emerald-200 select-all break-all text-slate-700"
                >
                  {decisionEvent.snapshotHash}
                </div>
              </div>
            )}

            {isOnDevice && (
              <div className="pt-3 border-t border-emerald-200/60">
                <Link
                  href="/tech"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Return to Field Tech View
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Customer & Job Info */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Service For</div>
            <div className="text-base font-bold text-slate-900">{job.customerName}</div>
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {job.serviceAddress}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {job.jobNumber}
            </span>
          </div>
        </div>

        {/* Itemized Scope */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Proposed Add-On Scope
          </div>
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {lineItems.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50/50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{item.title}</div>
                  {item.description && (
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Qty: {item.quantity} × {formatCents(item.unitPriceCents)}
                  </div>
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {formatCents(item.lineTotalCents)}
                </div>
              </div>
            ))}

            <div className="p-3 bg-white flex items-center justify-between font-bold text-sm">
              <span className="text-slate-700">Pre-Tax Total</span>
              <span data-testid="public-subtotal-cents" className="text-slate-900 text-base">
                {formatCents(co.subtotalCents)}
              </span>
            </div>
          </div>
        </div>

        {/* Attached Photo */}
        {co.photoDataUrl && (
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Field Documentation Photo
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex justify-center">
              <img
                src={co.photoDataUrl}
                alt="Job site documentation"
                className="max-h-60 object-contain"
              />
            </div>
          </div>
        )}

        {/* Technician Notes */}
        {co.notes && (
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Technician Notes
            </div>
            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
              {co.notes}
            </p>
          </div>
        )}

        {/* Interactive Signature Pad (only when pending_homeowner) */}
        {isPendingHomeowner && (
          <SignaturePadForm
            token={token}
            subtotalDisplay={formatCents(co.subtotalCents)}
            isOnDevice={isOnDevice}
            defaultCustomerName={job.customerName}
          />
        )}

        {/* Compliance Disclaimer Footer */}
        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
          <span>{tenant.disclaimerText}</span>
        </div>
      </div>
    </div>
  );
}
