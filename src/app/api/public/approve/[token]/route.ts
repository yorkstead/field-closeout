import { NextResponse } from "next/server";
import { db } from "@/db";
import { changeOrders, jobs, changeOrderLineItems, approvalEvents } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { computeSnapshotHash } from "@/lib/snapshot-hash";

const HomeownerDecisionSchema = z.object({
  decision: z.enum(["approved", "declined"]),
  signerName: z.string().trim().min(1, "Signer name is required").max(100),
  approvalMode: z.enum(["on_device", "share_link"]).default("share_link"),
  signaturePayload: z.string().max(100_000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const body = await request.json();
    const parsed = HomeownerDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { decision, signerName, approvalMode, signaturePayload } = parsed.data;

    // 1. Look up change order by token
    const coRows = await db
      .select({
        id: changeOrders.id,
        tenantId: changeOrders.tenantId,
        status: changeOrders.status,
        subtotalCents: changeOrders.subtotalCents,
        jobId: changeOrders.jobId,
      })
      .from(changeOrders)
      .where(eq(changeOrders.approvalToken, token))
      .limit(1);

    if (coRows.length === 0) {
      return NextResponse.json({ error: "Change order not found." }, { status: 404 });
    }
    const co = coRows[0];

    // 2. State verification
    if (co.status === "pending_office") {
      return NextResponse.json(
        { error: "Change order is awaiting office review before customer sign-off." },
        { status: 409 }
      );
    }

    if (co.status === "approved" || co.status === "declined" || co.status === "reconciled") {
      return NextResponse.json(
        { error: "This change order has already been decided." },
        { status: 409 }
      );
    }

    if (co.status !== "pending_homeowner") {
      return NextResponse.json(
        { error: `Cannot decide change order in status: "${co.status}".` },
        { status: 409 }
      );
    }

    // 3. Fetch Job and Line Items to compute tamper-evident snapshot hash
    const jobRows = await db
      .select({ jobNumber: jobs.jobNumber })
      .from(jobs)
      .where(eq(jobs.id, co.jobId))
      .limit(1);

    const jobNumber = jobRows[0]?.jobNumber || "JOB-UNKNOWN";

    const lineItemRows = await db
      .select({
        title: changeOrderLineItems.title,
        quantity: changeOrderLineItems.quantity,
        unitPriceCents: changeOrderLineItems.unitPriceCents,
        lineTotalCents: changeOrderLineItems.lineTotalCents,
      })
      .from(changeOrderLineItems)
      .where(eq(changeOrderLineItems.changeOrderId, co.id));

    const newStatus = decision === "approved" ? "approved" : "declined";
    const eventType = decision === "approved" ? "homeowner_approved" : "homeowner_declined";

    // 4. Compute cryptographic snapshot hash for approval
    const snapshotHash = computeSnapshotHash({
      changeOrderId: co.id,
      jobNumber,
      subtotalCents: co.subtotalCents,
      items: lineItemRows,
    });

    // 5. Transactional update & audit log
    await db.transaction(async (tx) => {
      await tx
        .update(changeOrders)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(changeOrders.id, co.id), eq(changeOrders.status, "pending_homeowner")));

      await tx.insert(approvalEvents).values({
        tenantId: co.tenantId,
        changeOrderId: co.id,
        eventType,
        actorType: "homeowner",
        actorName: signerName,
        approvalMode,
        signaturePayload: signaturePayload || null,
        snapshotTotalCents: co.subtotalCents,
        snapshotHash: decision === "approved" ? snapshotHash : null,
      });
    });

    return NextResponse.json({
      ok: true,
      status: newStatus,
      snapshotHash: decision === "approved" ? snapshotHash : null,
    });
  } catch (err) {
    console.error("Public approve error:", err);
    return NextResponse.json({ error: "Failed to process decision." }, { status: 500 });
  }
}
