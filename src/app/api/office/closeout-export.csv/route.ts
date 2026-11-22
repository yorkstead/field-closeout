import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { changeOrders, jobs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatCents } from "@/lib/money";
import { serializeToCsv } from "@/lib/csv";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization invariant: office or owner only
  if (session.role !== "office" && session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden: Office role required." }, { status: 403 });
  }

  try {
    const rows = await db
      .select({
        id: changeOrders.id,
        jobNumber: jobs.jobNumber,
        customerName: jobs.customerName,
        serviceAddress: jobs.serviceAddress,
        status: changeOrders.status,
        subtotalCents: changeOrders.subtotalCents,
        techName: users.displayName,
        reconciledInvoiceRef: changeOrders.reconciledInvoiceRef,
        reconciledAt: changeOrders.reconciledAt,
        createdAt: changeOrders.createdAt,
      })
      .from(changeOrders)
      .innerJoin(jobs, eq(changeOrders.jobId, jobs.id))
      .innerJoin(users, eq(changeOrders.createdByUserId, users.id))
      .where(eq(changeOrders.tenantId, session.tenantId))
      .orderBy(desc(changeOrders.createdAt));

    const headers = [
      "Change Order ID",
      "Job Number",
      "Customer Name",
      "Service Address",
      "Status",
      "Pre-Tax Amount",
      "Technician",
      "Reconciled Invoice #",
      "Reconciled At",
      "Created At",
    ];

    const dataRows = rows.map((r) => [
      r.id,
      r.jobNumber,
      r.customerName,
      r.serviceAddress,
      r.status,
      formatCents(r.subtotalCents),
      r.techName,
      r.reconciledInvoiceRef || "",
      r.reconciledAt ? new Date(r.reconciledAt).toISOString() : "",
      new Date(r.createdAt).toISOString(),
    ]);

    const csvContent = serializeToCsv(headers, dataRows);

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="field-closeout-queue.csv"',
      },
    });
  } catch (err) {
    console.error("CSV Export error:", err);
    return NextResponse.json({ error: "Failed to generate CSV." }, { status: 500 });
  }
}
