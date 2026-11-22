import { describe, expect, it } from "bun:test";
import {
  computeLineTotalCents,
  computeSubtotalCents,
  formatCents,
  parseDollarsToCents,
  assertIntegerCents,
  assertPositiveQuantity,
} from "../../src/lib/money";

describe("money utilities", () => {
  describe("computeLineTotalCents", () => {
    it("computes exact integer cents product for valid integer inputs", () => {
      expect(computeLineTotalCents(2, 18000)).toBe(36000);
      expect(computeLineTotalCents(1, 0)).toBe(0);
      expect(computeLineTotalCents(5, 599)).toBe(2995);
    });

    it("rejects floating-point numbers in unit price", () => {
      expect(() => computeLineTotalCents(2, 180.5 as unknown as number)).toThrow();
      expect(() => computeLineTotalCents(1, 0.99 as unknown as number)).toThrow();
    });

    it("rejects non-positive or floating quantities", () => {
      expect(() => computeLineTotalCents(0, 18000)).toThrow();
      expect(() => computeLineTotalCents(-1, 18000)).toThrow();
      expect(() => computeLineTotalCents(1.5 as unknown as number, 18000)).toThrow();
    });

    it("rejects negative unit price", () => {
      expect(() => computeLineTotalCents(1, -500)).toThrow();
    });
  });

  describe("computeSubtotalCents", () => {
    it("sums line items accurately", () => {
      expect(computeSubtotalCents([18000, 24500, 32000])).toBe(74500);
      expect(computeSubtotalCents([])).toBe(0);
    });

    it("rejects negative or float values in line totals", () => {
      expect(() => computeSubtotalCents([1000, -500])).toThrow();
      expect(() => computeSubtotalCents([1000, 50.5 as unknown as number])).toThrow();
    });
  });

  describe("formatCents", () => {
    it("formats integer cents to USD standard representation", () => {
      expect(formatCents(36000)).toBe("$360.00");
      expect(formatCents(0)).toBe("$0.00");
      expect(formatCents(50)).toBe("$0.50");
      expect(formatCents(5)).toBe("$0.05");
      expect(formatCents(123456789)).toBe("$1,234,567.89");
    });

    it("formats negative cents correctly", () => {
      expect(formatCents(-150)).toBe("-$1.50");
      expect(formatCents(-5000)).toBe("-$50.00");
    });

    it("rejects floating-point numbers", () => {
      expect(() => formatCents(123.45 as unknown as number)).toThrow();
      expect(() => formatCents(NaN)).toThrow();
      expect(() => formatCents(Infinity)).toThrow();
    });
  });

  describe("parseDollarsToCents", () => {
    it("correctly parses standard dollar strings", () => {
      expect(parseDollarsToCents("$180.00")).toBe(18000);
      expect(parseDollarsToCents("180")).toBe(18000);
      expect(parseDollarsToCents("0.50")).toBe(50);
      expect(parseDollarsToCents("$1,250.75")).toBe(125075);
    });

    it("rejects invalid inputs", () => {
      expect(() => parseDollarsToCents("abc")).toThrow();
      expect(() => parseDollarsToCents("12.345")).toThrow();
      expect(() => parseDollarsToCents("")).toThrow();
    });
  });

  describe("assertIntegerCents & assertPositiveQuantity", () => {
    it("validates types correctly", () => {
      expect(() => assertIntegerCents(100)).not.toThrow();
      expect(() => assertIntegerCents("100")).toThrow();
      expect(() => assertPositiveQuantity(1)).not.toThrow();
      expect(() => assertPositiveQuantity(0)).toThrow();
    });
  });
});
