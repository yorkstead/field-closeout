import { describe, expect, it } from "bun:test";
import {
  computeSnapshotHash,
  verifySnapshotHash,
  type SnapshotPayload,
} from "../../src/lib/snapshot-hash";

describe("snapshot-hash", () => {
  const samplePayload: SnapshotPayload = {
    changeOrderId: "e0000000-0000-4000-8000-000000000001",
    jobNumber: "JOB-2026-101",
    subtotalCents: 18000,
    items: [
      {
        title: "Replace Corroded Shutoff Valve",
        quantity: 1,
        unitPriceCents: 18000,
        lineTotalCents: 18000,
      },
    ],
  };

  it("produces a 64-character hex SHA-256 hash", () => {
    const hash = computeSnapshotHash(samplePayload);
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it("is deterministic regardless of item insertion order", () => {
    const payloadA: SnapshotPayload = {
      changeOrderId: "e0000000-0000-4000-8000-000000000002",
      jobNumber: "JOB-2026-102",
      subtotalCents: 56500,
      items: [
        { title: "Valve A", quantity: 1, unitPriceCents: 18000, lineTotalCents: 18000 },
        { title: "Circuit B", quantity: 1, unitPriceCents: 38500, lineTotalCents: 38500 },
      ],
    };

    const payloadB: SnapshotPayload = {
      changeOrderId: "e0000000-0000-4000-8000-000000000002",
      jobNumber: "JOB-2026-102",
      subtotalCents: 56500,
      items: [
        { title: "Circuit B", quantity: 1, unitPriceCents: 38500, lineTotalCents: 38500 },
        { title: "Valve A", quantity: 1, unitPriceCents: 18000, lineTotalCents: 18000 },
      ],
    };

    const hashA = computeSnapshotHash(payloadA);
    const hashB = computeSnapshotHash(payloadB);

    expect(hashA).toBe(hashB);
  });

  it("changes hash if any price or quantity is tampered with", () => {
    const originalHash = computeSnapshotHash(samplePayload);

    const tamperedPayload: SnapshotPayload = {
      ...samplePayload,
      subtotalCents: 17999, // tampered by 1 cent
    };

    const tamperedHash = computeSnapshotHash(tamperedPayload);
    expect(tamperedHash).not.toBe(originalHash);
  });

  it("verifies matching hash and rejects tampered hash", () => {
    const hash = computeSnapshotHash(samplePayload);
    expect(verifySnapshotHash(samplePayload, hash)).toBe(true);
    expect(verifySnapshotHash(samplePayload, "deadbeef".repeat(8))).toBe(false);
    expect(verifySnapshotHash(samplePayload, "invalid")).toBe(false);
  });

  it("rejects non-integer money amounts", () => {
    const invalidPayload: SnapshotPayload = {
      ...samplePayload,
      subtotalCents: 180.5 as unknown as number,
    };
    expect(() => computeSnapshotHash(invalidPayload)).toThrow();
  });
});
