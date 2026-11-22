import { describe, expect, it } from "bun:test";
import {
  routeChangeOrderStatus,
  resolveLineItemsAndSubtotal,
  PhotoPayloadSchema,
  CreateChangeOrderInputSchema,
} from "../../src/lib/change-orders";

describe("change-orders service layer", () => {
  describe("routeChangeOrderStatus", () => {
    it("routes to pending_homeowner when subtotal is strictly less than threshold", () => {
      expect(routeChangeOrderStatus(18000, 50000)).toBe("pending_homeowner");
      expect(routeChangeOrderStatus(49999, 50000)).toBe("pending_homeowner");
      expect(routeChangeOrderStatus(0, 50000)).toBe("pending_homeowner");
    });

    it("routes to pending_homeowner when subtotal is exactly at the threshold", () => {
      expect(routeChangeOrderStatus(50000, 50000)).toBe("pending_homeowner");
    });

    it("routes to pending_office when subtotal strictly exceeds the threshold", () => {
      expect(routeChangeOrderStatus(50001, 50000)).toBe("pending_office");
      expect(routeChangeOrderStatus(65000, 50000)).toBe("pending_office");
    });

    it("throws when given non-integer cents", () => {
      expect(() => routeChangeOrderStatus(500.5 as unknown as number, 50000)).toThrow();
      expect(() => routeChangeOrderStatus(50000, 500.5 as unknown as number)).toThrow();
    });
  });

  describe("resolveLineItemsAndSubtotal (Server Catalog Authority)", () => {
    const mockCatalogMap = new Map([
      [
        "c0000000-0000-4000-8000-000000000001",
        {
          id: "c0000000-0000-4000-8000-000000000001",
          name: "Replace Corroded Shutoff Valve",
          description: "DB catalog description",
          unitPriceCents: 18000,
        },
      ],
    ]);

    it("enforces server catalog price and ignores any client-submitted unitPriceCents", () => {
      const items = [
        {
          catalogItemId: "c0000000-0000-4000-8000-000000000001",
          title: "Client Spoofed Title",
          quantity: 2,
          unitPriceCents: 100, // Client tries to spoof $1.00 instead of $180.00
        },
      ];

      const { resolvedItems, subtotalCents } = resolveLineItemsAndSubtotal(items, mockCatalogMap);

      expect(resolvedItems[0].unitPriceCents).toBe(18000); // Enforced by DB catalog
      expect(resolvedItems[0].lineTotalCents).toBe(36000);
      expect(subtotalCents).toBe(36000);
    });

    it("computes subtotal accurately for custom line items", () => {
      const items = [
        {
          title: "Custom Pipe Repair",
          quantity: 1,
          unitPriceCents: 7500,
        },
      ];

      const { resolvedItems, subtotalCents } = resolveLineItemsAndSubtotal(items, new Map());
      expect(resolvedItems[0].unitPriceCents).toBe(7500);
      expect(resolvedItems[0].lineTotalCents).toBe(7500);
      expect(subtotalCents).toBe(7500);
    });

    it("throws if catalog item is not found in tenant's catalog", () => {
      const items = [
        {
          catalogItemId: "c9999999-0000-4000-8000-000000000001",
          title: "Missing Item",
          quantity: 1,
        },
      ];

      expect(() => resolveLineItemsAndSubtotal(items, mockCatalogMap)).toThrow("was not found");
    });
  });

  describe("PhotoPayloadSchema validation", () => {
    it("accepts allowlisted /demo-photos/ paths", () => {
      expect(PhotoPayloadSchema.safeParse("/demo-photos/shutoff-valve.svg").success).toBe(true);
      expect(PhotoPayloadSchema.safeParse("/demo-photos/condenser.png").success).toBe(true);
    });

    it("accepts valid base64 data URLs for JPEG, PNG, WebP", () => {
      const validJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
      const validPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
      const validWebp = "data:image/webp;base64,UklGRg==";

      expect(PhotoPayloadSchema.safeParse(validJpeg).success).toBe(true);
      expect(PhotoPayloadSchema.safeParse(validPng).success).toBe(true);
      expect(PhotoPayloadSchema.safeParse(validWebp).success).toBe(true);
    });

    it("rejects non-image MIME types", () => {
      const textHtml = "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==";
      expect(PhotoPayloadSchema.safeParse(textHtml).success).toBe(false);
    });

    it("rejects oversized payloads > 350KB", () => {
      const oversized = "data:image/png;base64," + "A".repeat(350_001);
      expect(PhotoPayloadSchema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("CreateChangeOrderInputSchema", () => {
    it("validates valid input payload", () => {
      const valid = {
        jobId: "d0000000-0000-4000-8000-000000000001",
        notes: "Test note",
        items: [
          {
            title: "Item 1",
            quantity: 1,
            unitPriceCents: 1000,
          },
        ],
      };
      expect(CreateChangeOrderInputSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects empty items array", () => {
      const emptyItems = {
        jobId: "d0000000-0000-4000-8000-000000000001",
        items: [],
      };
      expect(CreateChangeOrderInputSchema.safeParse(emptyItems).success).toBe(false);
    });
  });
});
