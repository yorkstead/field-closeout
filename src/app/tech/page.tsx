import { db } from "@/db";
import { jobs, catalogItems, tenants, changeOrders } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { CANONICAL_DEMO_TENANT, resolveTenantProfile } from "@/lib/tenant-theme";
import { formatCents } from "@/lib/money";
import Link from "next/link";
import { Wrench, MapPin, Briefcase, Plus, Clock, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";

export default async function TechPage() {
  let tenant = CANONICAL_DEMO_TENANT;
  let activeJobs: Array<{
    id: string;
    jobNumber: string;
    customerName: string;
    serviceAddress: string;
    status: string;
  }> = [];

  let jobCOs: Record<
    string,
    Array<{
      id: string;
      status: "pending_office" | "pending_homeowner" | "approved" | "declined" | "reconciled";
      subtotalCents: number;
    }>
  > = {};

  let catalog: Array<{
    id: string;
    name: string;
    description: string;
    unitPriceCents: number;
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

    activeJobs = await db
      .select({
        id: jobs.id,
        jobNumber: jobs.jobNumber,
        customerName: jobs.customerName,
        serviceAddress: jobs.serviceAddress,
        status: jobs.status,
      })
      .from(jobs)
      .where(eq(jobs.tenantId, tenant.id));

    if (activeJobs.length > 0) {
      const jobIds = activeJobs.map((j) => j.id);
      const coRows = await db
        .select({
          id: changeOrders.id,
          jobId: changeOrders.jobId,
          status: changeOrders.status,
          subtotalCents: changeOrders.subtotalCents,
        })
        .from(changeOrders)
        .where(inArray(changeOrders.jobId, jobIds));

      jobCOs = coRows.reduce((acc, co) => {
        if (!acc[co.jobId]) acc[co.jobId] = [];
        acc[co.jobId].push(co);
        return acc;
      }, {} as typeof jobCOs);
    }

    catalog = await db
      .select({
        id: catalogItems.id,
        name: catalogItems.name,
        description: catalogItems.description,
        unitPriceCents: catalogItems.unitPriceCents,
      })
      .from(catalogItems)
      .where(eq(catalogItems.tenantId, tenant.id));
  } catch (err) {
    console.warn("Could not query DB in TechPage:", err);
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-600 mb-1">
            <Wrench className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Field Tech Mobile View</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Today's Assigned Jobs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Logged in as <strong className="text-slate-800">Marcus Cole</strong> • {activeJobs.length} active work orders
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-sky-50 border border-sky-100 rounded-lg px-4 py-2 text-right">
            <div className="text-xs text-sky-700 font-medium">Tech Threshold</div>
            <div className="text-lg font-bold text-sky-900">
              {formatCents(tenant.approvalThresholdCents)}
            </div>
            <div className="text-[10px] text-sky-600">&le; Direct | &gt; Office Review</div>
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeJobs.map((job) => {
          const cos = jobCOs[job.id] || [];
          return (
            <div
              key={job.id}
              data-testid={`job-card-${job.jobNumber}`}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    <Briefcase className="w-3 h-3 text-slate-500" />
                    {job.jobNumber}
                  </span>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    In Progress
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{job.customerName}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {job.serviceAddress}
                </p>

                {/* Existing Change Orders on this Job */}
                {cos.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      Existing Add-Ons ({cos.length})
                    </div>
                    {cos.map((co) => (
                      <Link
                        key={co.id}
                        href={`/tech/change-orders/${co.id}`}
                        className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition group"
                      >
                        <div className="flex items-center gap-1.5">
                          {co.status === "pending_office" && (
                            <span className="text-amber-700 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Office Review
                            </span>
                          )}
                          {co.status === "pending_homeowner" && (
                            <span className="text-sky-700 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Awaiting Homeowner
                            </span>
                          )}
                          {co.status === "approved" && (
                            <span className="text-emerald-700 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          )}
                          <span className="font-bold text-slate-800">
                            {formatCents(co.subtotalCents)}
                          </span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">&lt;30s Add-On</span>
                <Link
                  href={`/tech/jobs/${job.id}/new-change-order`}
                  data-testid={`capture-addon-${job.jobNumber}`}
                  className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Change Order
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Flat-rate catalog preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
          Flat-Rate Add-On Catalog ({catalog.length} items)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {catalog.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between"
            >
              <div>
                <div className="font-semibold text-slate-800 text-sm">{item.name}</div>
                <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</div>
              </div>
              <div className="mt-2 text-right">
                <span className="text-sm font-bold text-slate-900">{formatCents(item.unitPriceCents)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
