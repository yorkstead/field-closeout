import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { jobs, changeOrders } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobList = await db
      .select({
        id: jobs.id,
        jobNumber: jobs.jobNumber,
        customerName: jobs.customerName,
        serviceAddress: jobs.serviceAddress,
        status: jobs.status,
        assignedTechId: jobs.assignedTechId,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .where(eq(jobs.tenantId, session.tenantId));

    // Also fetch change orders for these jobs to provide counts/statuses
    const coList = await db
      .select({
        id: changeOrders.id,
        jobId: changeOrders.jobId,
        status: changeOrders.status,
        subtotalCents: changeOrders.subtotalCents,
        createdAt: changeOrders.createdAt,
      })
      .from(changeOrders)
      .where(eq(changeOrders.tenantId, session.tenantId));

    const jobsWithChangeOrders = jobList.map((job) => {
      const relatedCOs = coList.filter((co) => co.jobId === job.id);
      return {
        ...job,
        changeOrdersCount: relatedCOs.length,
        changeOrders: relatedCOs,
      };
    });

    return NextResponse.json({ jobs: jobsWithChangeOrders });
  } catch (err) {
    console.error("GET /api/jobs error:", err);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
