import { z } from "zod";
import { db } from "@/db";
import {
  changeOrders,
  changeOrderLineItems,
  approvalEvents,
  catalogItems,
  jobs,
  tenants,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  computeLineTotalCents,
  computeSubtotalCents,
  assertIntegerCents,
} from "./money";
import { randomBytes } from "crypto";
import type { SessionUser } from "./session";

export const MAX_PHOTO_CHAR_LENGTH = 350_000;

export const PhotoPayloadSchema = z
  .string()
  .refine(
    (val) => {
      if (val.startsWith("/demo-photos/")) return true;
      if (val.length > MAX_PHOTO_CHAR_LENGTH) return false;
      return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(val);
    },
    {
      message:
        "Photo must be a valid JPEG, PNG, or WebP data URL under 350KB or an allowlisted /demo-photos/ path.",
    }
  );

export const ChangeOrderItemInputSchema = z.object({
  catalogItemId: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().max(500).optional().default(""),
  quantity: z.number().int().min(1).max(99),
  unitPriceCents: z.number().int().min(0).optional(),
});

export const CreateChangeOrderInputSchema = z.object({
  jobId: z.string().uuid(),
  notes: z.string().max(1000).optional().default(""),
  photoDataUrl: PhotoPayloadSchema.optional(),
  items: z.array(ChangeOrderItemInputSchema).min(1, "At least one item is required").max(20),
});

export type CreateChangeOrderInput = z.infer<typeof CreateChangeOrderInputSchema>;

export interface ResolvedLineItem {
  catalogItemId?: string;
  title: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

/**
 * Pure helper to route change order status based on subtotal and threshold.
 * Invariant: subtotal <= threshold -> pending_homeowner; subtotal > threshold -> pending_office.
 */
export function routeChangeOrderStatus(
  subtotalCents: number,
  thresholdCents: number
): "pending_homeowner" | "pending_office" {
  assertIntegerCents(subtotalCents, "subtotalCents");
  assertIntegerCents(thresholdCents, "thresholdCents");

  return subtotalCents <= thresholdCents ? "pending_homeowner" : "pending_office";
}

export interface ChangeOrderItemInput {
  catalogItemId?: string;
  title: string;
  description?: string;
  quantity: number;
  unitPriceCents?: number;
}

/**
 * Pure calculation helper to resolve catalog prices and calculate line totals.
 */
export function resolveLineItemsAndSubtotal(
  items: ChangeOrderItemInput[],
  catalogMap: Map<string, { id: string; name: string; description: string; unitPriceCents: number }>
): { resolvedItems: ResolvedLineItem[]; subtotalCents: number } {
  const resolvedItems: ResolvedLineItem[] = [];

  for (const item of items) {
    let unitPriceCents: number;
    let title = item.title;
    let description = item.description || "";

    if (item.catalogItemId) {
      const catalogRecord = catalogMap.get(item.catalogItemId);
      if (!catalogRecord) {
        throw new Error(`Catalog item with ID "${item.catalogItemId}" was not found or is inactive.`);
      }
      // Server authority: enforce catalog item DB price
      unitPriceCents = catalogRecord.unitPriceCents;
      if (!title) {
        title = catalogRecord.name;
      }
      if (!description) {
        description = catalogRecord.description;
      }
    } else {
      if (typeof item.unitPriceCents !== "number") {
        throw new Error(`Custom line item "${item.title}" requires a valid unitPriceCents.`);
      }
      unitPriceCents = item.unitPriceCents;
    }

    const lineTotalCents = computeLineTotalCents(item.quantity, unitPriceCents);
    resolvedItems.push({
      catalogItemId: item.catalogItemId,
      title,
      description,
      quantity: item.quantity,
      unitPriceCents,
      lineTotalCents,
    });
  }

  const subtotalCents = computeSubtotalCents(resolvedItems.map((r) => r.lineTotalCents));
  return { resolvedItems, subtotalCents };
}

/**
 * Creates a change order with atomic database persistence and audit trail.
 */
export async function createChangeOrder(
  rawInput: unknown,
  session: SessionUser
) {
  const input = CreateChangeOrderInputSchema.parse(rawInput);

  // 1. Verify Job belongs to session tenant
  const jobRows = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, input.jobId), eq(jobs.tenantId, session.tenantId)))
    .limit(1);

  if (jobRows.length === 0) {
    throw new Error(`Job "${input.jobId}" not found for active tenant.`);
  }

  // 2. Look up tenant for approval threshold
  const tenantRows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, session.tenantId))
    .limit(1);

  if (tenantRows.length === 0) {
    throw new Error(`Tenant "${session.tenantId}" not found.`);
  }
  const tenant = tenantRows[0];

  // 3. Look up referenced catalog items
  const catalogIds = input.items
    .map((i) => i.catalogItemId)
    .filter((id): id is string => Boolean(id));

  const catalogMap = new Map<string, { id: string; name: string; description: string; unitPriceCents: number }>();
  if (catalogIds.length > 0) {
    const catalogRows = await db
      .select({
        id: catalogItems.id,
        name: catalogItems.name,
        description: catalogItems.description,
        unitPriceCents: catalogItems.unitPriceCents,
      })
      .from(catalogItems)
      .where(
        and(
          eq(catalogItems.tenantId, session.tenantId),
          inArray(catalogItems.id, catalogIds)
        )
      );

    for (const cat of catalogRows) {
      catalogMap.set(cat.id, cat);
    }
  }

  // 4. Resolve prices & compute line totals + subtotal
  const { resolvedItems, subtotalCents } = resolveLineItemsAndSubtotal(
    input.items,
    catalogMap
  );

  // 5. Determine threshold routing
  const status = routeChangeOrderStatus(subtotalCents, tenant.approvalThresholdCents);

  // 6. Generate unguessable approval token
  const approvalToken = randomBytes(32).toString("hex");

  // 7. Atomic DB Transaction
  return await db.transaction(async (tx) => {
    // Insert Change Order
    const [createdCO] = await tx
      .insert(changeOrders)
      .values({
        tenantId: session.tenantId,
        jobId: input.jobId,
        createdByUserId: session.userId,
        status,
        subtotalCents,
        notes: input.notes || "",
        photoDataUrl: input.photoDataUrl || null,
        approvalToken,
      })
      .returning();

    // Insert Line Items
    const lineItemValues = resolvedItems.map((item) => ({
      tenantId: session.tenantId,
      changeOrderId: createdCO.id,
      catalogItemId: item.catalogItemId || null,
      title: item.title,
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
    }));

    await tx.insert(changeOrderLineItems).values(lineItemValues);

    // Append initial submitted audit event
    await tx.insert(approvalEvents).values({
      tenantId: session.tenantId,
      changeOrderId: createdCO.id,
      eventType: "submitted",
      actorType: session.role === "office" ? "office" : "tech",
      actorName: session.displayName,
      snapshotTotalCents: subtotalCents,
    });

    return {
      changeOrder: createdCO,
      lineItems: resolvedItems,
      subtotalCents,
      status,
      approvalToken,
    };
  });
}
