import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  changeOrders,
  jobs,
  changeOrderLineItems,
  users,
  tenants,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/session";
import { CANONICAL_DEMO_TENANT, resolveTenantProfile } from "@/lib/tenant-theme";
import { formatCents } from "@/lib/money";
import { HandoffActions } from "@/components/HandoffActions";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  FileText,
} from "lucide-react";

export default async function ChangeOrderHandoffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession();
  const tenantId = session?.tenantId || CANONICAL_DEMO_TENANT.id;

  // 1. Fetch Change Order with Job and Creator
  const coRows = await db
    .select({
      id: changeOrders.id,
      status: changeOrders.status,
      subtotalCents: changeOrders.subtotalCents,
      notes: changeOrders.notes,
      photoDataUrl: changeOrders.photoDataUrl,
      approvalToken: changeOrders.approvalToken,
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
    console.warn("Could not query tenant:", err);
  }

  const isPendingHomeowner = co.status === "pending_homeowner";
  const isPendingOffice = co.status === "pending_office";
  const isApproved = co.status === "approved";

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back button */}
      <div>
        <Link
          href="/tech"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Today's Jobs
        </Link>
      </div>

      {/* Main Status & Action Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        {/* Status Header */}
        {isPendingHomeowner && (
          <div
            data-testid="status-pending-homeowner-card"
            className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-full bg-sky-600 text-white">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <div>
                <h2 className="font-bold text-sm text-sky-900">
                  Approved for Field Presentation
                </h2>
                <p className="text-xs text-sky-700">
                  Total {formatCents(co.subtotalCents)} is within your {formatCents(tenant.approvalThresholdCents)} limit.
                </p>
              </div>
            </div>

            <HandoffActions approvalToken={co.approvalToken} />
          </div>
        )}

        {isPendingOffice && (
          <div
            data-testid="status-pending-office-card"
            className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-3"
          >
            <div className="flex items-start gap-3">
              <span className="p-1.5 rounded-full bg-amber-600 text-white shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <h2 className="font-bold text-sm text-amber-900">
                  Sent to Office for Price Review
                </h2>
                <p className="text-xs text-amber-800 mt-0.5">
                  Total of <strong>{formatCents(co.subtotalCents)}</strong> exceeds your field authorization threshold (
                  {formatCents(tenant.approvalThresholdCents)}).
                </p>
                <p className="text-[11px] text-amber-700 mt-1">
                  Dana Reyes in the office has been routed this change order for margin/pricing confirmation before releasing to the homeowner.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
              <span className="text-xs text-amber-800 font-medium">Status: Pending Office</span>
              <Link
                href="/tech"
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition"
              >
                Return to Jobs
              </Link>
            </div>
          </div>
        )}

        {isApproved && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-sm text-emerald-900">Change Order Approved</h2>
              <p className="text-xs text-emerald-700 mt-0.5">
                Customer has signed and approved this change order for {formatCents(co.subtotalCents)}.
              </p>
            </div>
          </div>
        )}

        {/* Job & Customer Details */}
        <div className="pt-2 border-t border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Customer & Job</div>
            <div className="text-base font-bold text-slate-900">{co.customerName}</div>
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {co.serviceAddress}
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {co.jobNumber}
            </span>
            <div className="text-[11px] text-slate-400 mt-1">Captured by {co.techName}</div>
          </div>
        </div>

        {/* Scope Breakdown */}
        <div className="pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
            Scope & Line Items ({lineItems.length})
          </div>
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {lineItems.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50/50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{item.title}</div>
                  {item.description && (
                    <div className="text-[11px] text-slate-500">{item.description}</div>
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
              <span data-testid="handoff-subtotal-cents" className="text-slate-900 text-base">
                {formatCents(co.subtotalCents)}
              </span>
            </div>
          </div>
        </div>

        {/* Attached Photo */}
        {co.photoDataUrl && (
          <div className="pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
              Attached Job-Site Photo
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex justify-center">
              <img
                src={co.photoDataUrl}
                alt="Job site documentation"
                className="max-h-64 object-contain"
              />
            </div>
          </div>
        )}

        {/* Field Notes */}
        {co.notes && (
          <div className="pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
              Field Notes
            </div>
            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
              {co.notes}
            </p>
          </div>
        )}

        {/* Compliance Footer */}
        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span>{tenant.disclaimerText}</span>
        </div>
      </div>
    </div>
  );
}
