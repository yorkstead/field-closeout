import { notFound } from "next/navigation";
import { db } from "@/db";
import { jobs, catalogItems, tenants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/session";
import { CANONICAL_DEMO_TENANT, resolveTenantProfile } from "@/lib/tenant-theme";
import { CaptureChangeOrderForm } from "@/components/CaptureChangeOrderForm";
import Link from "next/link";
import { ArrowLeft, Briefcase, MapPin } from "lucide-react";

export default async function NewChangeOrderPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const session = await getServerSession();
  const tenantId = session?.tenantId || CANONICAL_DEMO_TENANT.id;

  // 1. Fetch Job
  const jobRows = await db
    .select({
      id: jobs.id,
      jobNumber: jobs.jobNumber,
      customerName: jobs.customerName,
      serviceAddress: jobs.serviceAddress,
    })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
    .limit(1);

  if (jobRows.length === 0) {
    notFound();
  }
  const job = jobRows[0];

  // 2. Fetch Tenant Config & Catalog
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
    console.warn("Could not query tenant in NewChangeOrderPage:", err);
  }

  const catalog = await db
    .select({
      id: catalogItems.id,
      name: catalogItems.name,
      description: catalogItems.description,
      unitPriceCents: catalogItems.unitPriceCents,
    })
    .from(catalogItems)
    .where(and(eq(catalogItems.tenantId, tenantId), eq(catalogItems.active, true)));

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back link */}
      <div>
        <Link
          href="/tech"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Today's Jobs
        </Link>
      </div>

      {/* Target Job Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
            Capturing Mid-Job Add-On
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
            {job.jobNumber}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{job.customerName}</h1>
        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {job.serviceAddress}
        </p>
      </div>

      {/* Capture Form */}
      <CaptureChangeOrderForm
        job={job}
        catalog={catalog}
        approvalThresholdCents={tenant.approvalThresholdCents}
      />
    </div>
  );
}
