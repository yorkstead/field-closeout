import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { changeOrders, changeOrderLineItems, approvalEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { computeLineTotalCents, computeSubtotalCents, assertNonNegativeCents } from "@/lib/money";

const ReleaseSchema = z.object({
  adjustedItems: z
    .array(
      z.object({
        lineItemId: z.string().uuid(),
        unitPriceCents: z.number().int().min(0),
      })
    )
    .optional(),
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
      { error: "Forbidden: Tech role cannot release over-threshold change orders." },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = ReleaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { adjustedItems } = parsed.data;

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

    if (co.status !== "pending_office") {
      return NextResponse.json(
        { error: `Cannot release change order with status "${co.status}". Must be "pending_office".` },
        { status: 409 }
      );
    }

    // 2. Fetch current line items
    const lineItemRows = await db
      .select()
      .from(changeOrderLineItems)
      .where(eq(changeOrderLineItems.changeOrderId, co.id));

    let finalSubtotalCents = co.subtotalCents;
    const isAdjusted = Boolean(adjustedItems && adjustedItems.length > 0);
    const lineItemUpdates: { id: string; unitPriceCents: number; lineTotalCents: number }[] = [];

    if (isAdjusted && adjustedItems) {
      const adjustmentMap = new Map(adjustedItems.map((a) => [a.lineItemId, a.unitPriceCents]));
      const updatedTotals: number[] = [];

      for (const item of lineItemRows) {
        let unitPrice = item.unitPriceCents;
        if (adjustmentMap.has(item.id)) {
          unitPrice = adjustmentMap.get(item.id)!;
          assertNonNegativeCents(unitPrice, `adjusted unit price for ${item.title}`);

          const lineTotal = computeLineTotalCents(item.quantity, unitPrice);
          lineItemUpdates.push({
            id: item.id,
            unitPriceCents: unitPrice,
            lineTotalCents: lineTotal,
          });
          updatedTotals.push(lineTotal);
        } else {
          updatedTotals.push(item.lineTotalCents);
        }
      }

      finalSubtotalCents = computeSubtotalCents(updatedTotals);
    }

    await db.transaction(async (tx) => {
      // Check and update change order status to pending_homeowner first
      const updated = await tx
        .update(changeOrders)
        .set({
          status: "pending_homeowner",
          subtotalCents: finalSubtotalCents,
          updatedAt: new Date(),
        })
        .where(and(eq(changeOrders.id, co.id), eq(changeOrders.status, "pending_office")))
        .returning({ id: changeOrders.id });

      if (updated.length === 0) {
        throw new Error("CONFLICT_STATE_CHANGED");
      }

      // Mutate line items only after change order status check succeeds
      for (const update of lineItemUpdates) {
        await tx
          .update(changeOrderLineItems)
          .set({
            unitPriceCents: update.unitPriceCents,
            lineTotalCents: update.lineTotalCents,
          })
          .where(eq(changeOrderLineItems.id, update.id));
      }

      // Append audit event
      await tx.insert(approvalEvents).values({
        tenantId: session.tenantId,
        changeOrderId: co.id,
        eventType: isAdjusted ? "office_adjusted" : "office_approved",
        actorType: "office",
        actorName: session.displayName,
        snapshotTotalCents: finalSubtotalCents,
      });
    });

    return NextResponse.json({
      ok: true,
      status: "pending_homeowner",
      subtotalCents: finalSubtotalCents,
      eventType: isAdjusted ? "office_adjusted" : "office_approved",
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "CONFLICT_STATE_CHANGED") {
      return NextResponse.json(
        { error: "Change order status has already changed." },
        { status: 409 }
      );
    }
    console.error("Office release error:", err);
    return NextResponse.json({ error: "Failed to release change order." }, { status: 500 });
  }
}
