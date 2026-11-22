import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { changeOrders, approvalEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const ReconcileSchema = z.object({
  reconciledInvoiceRef: z
    .string()
    .trim()
    .min(1, "Invoice reference number is required (e.g. INV-4821)")
    .max(60),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization invariant: office or owner only
  if (session.role !== "office" && session.role !== "owner") {
    return NextResponse.json(
      { error: "Forbidden: Tech role cannot reconcile change orders." },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = ReconcileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { reconciledInvoiceRef } = parsed.data;

    // 1. Fetch Change Order scoped to tenant
    const coRows = await db
      .select()
      .from(changeOrders)
      .where(and(eq(changeOrders.id, id), eq(changeOrders.tenantId, session.tenantId)))
      .limit(1);

    if (coRows.length === 0) {
      return NextResponse.json({ error: "Change order not found." }, { status: 404 });
    }
    const co = coRows[0];

    if (co.status !== "approved") {
      return NextResponse.json(
        { error: `Cannot reconcile change order with status "${co.status}". Must be "approved".` },
        { status: 409 }
      );
    }

    const reconciledAt = new Date();

    // 2. Transactional reconciliation
    await db.transaction(async (tx) => {
      await tx
        .update(changeOrders)
        .set({
          status: "reconciled",
          reconciledInvoiceRef,
          reconciledAt,
          reconciledByUserId: session.userId,
          updatedAt: reconciledAt,
        })
        .where(and(eq(changeOrders.id, co.id), eq(changeOrders.status, "approved")));

      await tx.insert(approvalEvents).values({
        tenantId: session.tenantId,
        changeOrderId: co.id,
        eventType: "reconciled",
        actorType: "office",
        actorName: session.displayName,
        snapshotTotalCents: co.subtotalCents,
      });
    });

    return NextResponse.json({
      ok: true,
      status: "reconciled",
      reconciledInvoiceRef,
      reconciledAt: reconciledAt.toISOString(),
    });
  } catch (err) {
    console.error("Reconcile error:", err);
    return NextResponse.json({ error: "Failed to reconcile change order." }, { status: 500 });
  }
}
