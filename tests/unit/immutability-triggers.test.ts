import { describe, expect, it } from "bun:test";
import { db } from "../../src/db";
import { changeOrderLineItems, approvalEvents } from "../../src/db/schema";
import { eq } from "drizzle-orm";

describe("PostgreSQL Immutability Triggers", () => {
  const approvedCoId = "e0000000-0000-4000-8000-000000000003";

  it("blocks UPDATE on change_order_line_items when parent change order is approved", async () => {
    let thrownError: unknown = null;
    try {
      await db
        .update(changeOrderLineItems)
        .set({ quantity: 5 })
        .where(eq(changeOrderLineItems.changeOrderId, approvedCoId));
    } catch (e) {
      thrownError = e;
    }

    expect(thrownError).not.toBeNull();
    const message = (thrownError as any)?.cause?.message || String(thrownError);
    expect(message).toContain("Cannot modify or delete line items");
  });

  it("blocks DELETE on change_order_line_items when parent change order is approved", async () => {
    let thrownError: unknown = null;
    try {
      await db
        .delete(changeOrderLineItems)
        .where(eq(changeOrderLineItems.changeOrderId, approvedCoId));
    } catch (e) {
      thrownError = e;
    }

    expect(thrownError).not.toBeNull();
    const message = (thrownError as any)?.cause?.message || String(thrownError);
    expect(message).toContain("Cannot modify or delete line items");
  });

  it("blocks UPDATE on approval_events (append-only audit log)", async () => {
    const sampleEventId = "a1000000-0000-4000-8000-000000000001";
    let thrownError: unknown = null;
    try {
      await db
        .update(approvalEvents)
        .set({ actorName: "Tampered Name" })
        .where(eq(approvalEvents.id, sampleEventId));
    } catch (e) {
      thrownError = e;
    }

    expect(thrownError).not.toBeNull();
    const message = (thrownError as any)?.cause?.message || String(thrownError);
    expect(message).toContain("approval_events is an immutable append-only audit trail");
  });

  it("blocks DELETE on approval_events (append-only audit log)", async () => {
    const sampleEventId = "a1000000-0000-4000-8000-000000000001";
    let thrownError: unknown = null;
    try {
      await db
        .delete(approvalEvents)
        .where(eq(approvalEvents.id, sampleEventId));
    } catch (e) {
      thrownError = e;
    }

    expect(thrownError).not.toBeNull();
    const message = (thrownError as any)?.cause?.message || String(thrownError);
    expect(message).toContain("approval_events is an immutable append-only audit trail");
  });
});
