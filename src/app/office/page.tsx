import { db } from "@/db";
import { changeOrders, jobs, users, tenants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { CANONICAL_DEMO_TENANT, resolveTenantProfile } from "@/lib/tenant-theme";
import { formatCents } from "@/lib/money";
import { Building2, CheckCircle2, Clock, FileText, AlertCircle, ArrowUpRight } from "lucide-react";

export default async function OfficePage() {
  let tenant = CANONICAL_DEMO_TENANT;
  let coList: Array<{
    id: string;
    jobNumber: string;
    customerName: string;
    status: "pending_office" | "pending_homeowner" | "approved" | "declined" | "reconciled";
    subtotalCents: number;
    notes: string;
    techName: string;
    createdAt: Date;
  }> = [];

  try {
    const tenantRows = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, CANONICAL_DEMO_TENANT.id))
      .limit(1);
    if (tenantRows.length > 0) {
      tenant = resolveTenantProfile(tenantRows[0]);
    }

    const rows = await db
      .select({
        id: changeOrders.id,
        jobNumber: jobs.jobNumber,
        customerName: jobs.customerName,
        status: changeOrders.status,
        subtotalCents: changeOrders.subtotalCents,
        notes: changeOrders.notes,
        techName: users.displayName,
        createdAt: changeOrders.createdAt,
      })
      .from(changeOrders)
      .innerJoin(jobs, eq(changeOrders.jobId, jobs.id))
      .innerJoin(users, eq(changeOrders.createdByUserId, users.id))
      .where(eq(changeOrders.tenantId, tenant.id))
      .orderBy(desc(changeOrders.createdAt));

    coList = rows;
  } catch (err) {
    console.warn("Could not query DB in OfficePage:", err);
  }

  const pendingOfficeCount = coList.filter((co) => co.status === "pending_office").length;
  const pendingHomeownerCount = coList.filter((co) => co.status === "pending_homeowner").length;
  const approvedCount = coList.filter((co) => co.status === "approved").length;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Building2 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Office Manager Queue</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Change-Order Closeout Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Logged in as <strong className="text-slate-800">Dana Reyes</strong> • {coList.length} total change orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
            <div className="text-[11px] text-amber-800 font-semibold uppercase">Needs Office Review</div>
            <div className="text-lg font-bold text-amber-900">{pendingOfficeCount}</div>
          </div>
          <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-center">
            <div className="text-[11px] text-sky-800 font-semibold uppercase">Pending Homeowner</div>
            <div className="text-lg font-bold text-sky-900">{pendingHomeownerCount}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-center">
            <div className="text-[11px] text-emerald-800 font-semibold uppercase">Approved</div>
            <div className="text-lg font-bold text-emerald-900">{approvedCount}</div>
          </div>
        </div>
      </div>

      {/* Notice card for change 003 */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-lg p-4 text-xs text-indigo-900 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <strong>Phase 1 Walking Skeleton:</strong> Live change order records loaded from PostgreSQL.
          Office price adjustment, printable Closeout Summary, and invoice reconciliation will be wired in{" "}
          <code>003-homeowner-approval-and-closeout</code>.
        </div>
      </div>

      {/* Change Orders Table / Cards */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            Active Change Orders
          </h2>
          <span className="text-xs text-slate-400">All amounts pre-tax integer cents</span>
        </div>

        <div className="divide-y divide-slate-100">
          {coList.map((co) => {
            const isOfficePending = co.status === "pending_office";
            const isHomeownerPending = co.status === "pending_homeowner";
            const isApproved = co.status === "approved";

            return (
              <div
                key={co.id}
                data-testid={`change-order-row-${co.id}`}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {co.jobNumber}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{co.customerName}</span>

                    {/* Status Badge */}
                    {isOfficePending && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending Office Review (&gt; $500)
                      </span>
                    )}
                    {isHomeownerPending && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Awaiting Homeowner
                      </span>
                    )}
                    {isApproved && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Approved — Ready to Reconcile
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{co.notes}</p>
                  <p className="text-[11px] text-slate-400">
                    Captured by {co.techName}
                  </p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-base font-bold text-slate-900">
                      {formatCents(co.subtotalCents)}
                    </div>
                    <div className="text-[11px] text-slate-400">Pre-tax total</div>
                  </div>

                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1"
                  >
                    View Details
                    <ArrowUpRight className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
