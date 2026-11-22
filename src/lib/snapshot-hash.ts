import { createHash } from "crypto";
import { assertIntegerCents } from "./money";

export interface SnapshotItem {
  title: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface SnapshotPayload {
  changeOrderId: string;
  jobNumber: string;
  subtotalCents: number;
  items: SnapshotItem[];
}

/**
 * Computes a deterministic SHA-256 hash of canonical change order approval scope and totals.
 * Yorkstead Invariant: Immutable post-decision records with cryptographic verification.
 */
export function computeSnapshotHash(payload: SnapshotPayload): string {
  assertIntegerCents(payload.subtotalCents, "subtotalCents");

  // Canonicalize and sort items deterministically
  const sortedItems = [...payload.items].sort((a, b) => a.title.localeCompare(b.title));

  for (const item of sortedItems) {
    assertIntegerCents(item.unitPriceCents, `unitPriceCents for ${item.title}`);
    assertIntegerCents(item.lineTotalCents, `lineTotalCents for ${item.title}`);
  }

  const canonicalPayload = {
    changeOrderId: payload.changeOrderId,
    jobNumber: payload.jobNumber,
    subtotalCents: payload.subtotalCents,
    items: sortedItems.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
    })),
  };

  const jsonString = JSON.stringify(canonicalPayload);
  return createHash("sha256").update(jsonString, "utf8").digest("hex");
}

export function verifySnapshotHash(
  payload: SnapshotPayload,
  expectedHash: string
): boolean {
  if (!expectedHash || expectedHash.length !== 64) {
    return false;
  }
  return computeSnapshotHash(payload) === expectedHash;
}
