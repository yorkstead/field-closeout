import { db } from "@/db";
import {
  changeOrders,
  jobs,
  users,
  tenants,
  changeOrderLineItems,
} from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { getServerSession } from "@/lib/session";
import { CANONICAL_DEMO_TENANT, resolveTenantProfile } from "@/lib/tenant-theme";
import { OfficeQueueTable, type OfficeChangeOrderRow } from "@/components/OfficeQueueTable";
import { Building2 } from "lucide-react";

export default async function OfficePage() {
  const session = await getServerSession();
  const tenantId = session?.tenantId || CANONICAL_DEMO_TENANT.id;

  let tenant = CANONICAL_DEMO_TENANT;
  let formattedRows: OfficeChangeOrderRow[] = [];

  try {
    const tenantRows = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (tenantRows.length > 0) {
      tenant = resolveTenantProfile(tenantRows[0]);
    }

    const coRows = await db
      .select({
        id: changeOrders.id,
        jobNumber: jobs.jobNumber,
        customerName: jobs.customerName,
        serviceAddress: jobs.serviceAddress,
        status: changeOrders.status,
        subtotalCents: changeOrders.subtotalCents,
        notes: changeOrders.notes,
        techName: users.displayName,
        approvalToken: changeOrders.approvalToken,
        reconciledInvoiceRef: changeOrders.reconciledInvoiceRef,
        reconciledAt: changeOrders.reconciledAt,
        createdAt: changeOrders.createdAt,
      })
      .from(changeOrders)
      .innerJoin(jobs, eq(changeOrders.jobId, jobs.id))
      .innerJoin(users, eq(changeOrders.createdByUserId, users.id))
      .where(eq(changeOrders.tenantId, tenant.id))
      .orderBy(desc(changeOrders.createdAt));

    if (coRows.length > 0) {
      const coIds = coRows.map((r) => r.id);
      const allLineItems = await db
        .select({
          id: changeOrderLineItems.id,
          changeOrderId: changeOrderLineItems.changeOrderId,
          title: changeOrderLineItems.title,
          quantity: changeOrderLineItems.quantity,
          unitPriceCents: changeOrderLineItems.unitPriceCents,
          lineTotalCents: changeOrderLineItems.lineTotalCents,
        })
        .from(changeOrderLineItems)
        .where(inArray(changeOrderLineItems.changeOrderId, coIds));

      const lineItemMap = allLineItems.reduce((acc, item) => {
        if (!acc[item.changeOrderId]) acc[item.changeOrderId] = [];
        acc[item.changeOrderId].push(item);
        return acc;
      }, {} as Record<string, typeof allLineItems>);

      formattedRows = coRows.map((r) => ({
        ...r,
        lineItems: lineItemMap[r.id] || [],
      }));
    }
  } catch (err) {
    console.warn("Could not query DB in OfficePage:", err);
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Building2 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Office Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Change-Order Closeout Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Logged in as <strong className="text-slate-800">Dana Reyes</strong> • {formattedRows.length} total change orders
          </p>
        </div>

        <div className="text-right text-xs text-slate-500">
          <div>Tenant Approval Limit: <strong className="text-slate-800">${tenant.approvalThresholdCents / 100}</strong></div>
          <div className="text-[11px] text-slate-400">All pricing pre-tax flat-rate</div>
        </div>
      </div>

      {/* Interactive Queue & KPI Cards */}
      <OfficeQueueTable
        changeOrders={formattedRows}
        thresholdCents={tenant.approvalThresholdCents}
      />
    </div>
  );
}
