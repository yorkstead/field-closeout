/**
 * Exact money math utilities for Field Closeout.
 * Yorkstead Invariant: Store and compute all currency as integer minor units (cents).
 * Never use floating-point number arithmetic for money.
 */

export function assertIntegerCents(value: unknown, label = "Cents value"): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isSafeInteger(value)) {
    throw new TypeError(`${label} must be a safe integer, got: ${String(value)} (${typeof value})`);
  }
}

export function assertNonNegativeCents(value: unknown, label = "Cents value"): asserts value is number {
  assertIntegerCents(value, label);
  if (value < 0) {
    throw new RangeError(`${label} must be non-negative, got: ${value}`);
  }
}

export function assertPositiveQuantity(value: unknown, label = "Quantity"): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be an integer greater than 0, got: ${String(value)}`);
  }
}

/**
 * Computes line total cents from integer quantity and integer unit price.
 * Rejects non-integer or negative inputs.
 */
export function computeLineTotalCents(quantity: number, unitPriceCents: number): number {
  assertPositiveQuantity(quantity, "quantity");
  assertNonNegativeCents(unitPriceCents, "unitPriceCents");

  const total = quantity * unitPriceCents;
  if (!Number.isSafeInteger(total)) {
    throw new RangeError(`Line total computation exceeded safe integer bounds: ${quantity} * ${unitPriceCents}`);
  }
  return total;
}

/**
 * Computes change order subtotal cents by summing line item totals.
 */
export function computeSubtotalCents(lineItemTotals: number[]): number {
  let subtotal = 0;
  for (let i = 0; i < lineItemTotals.length; i++) {
    const itemTotal = lineItemTotals[i];
    assertNonNegativeCents(itemTotal, `lineItemTotals[${i}]`);
    subtotal += itemTotal;
    if (!Number.isSafeInteger(subtotal)) {
      throw new RangeError("Subtotal computation exceeded safe integer bounds");
    }
  }
  return subtotal;
}

/**
 * Formats integer cents into a standard USD currency string.
 * Example: 36000 -> "$360.00", 50 -> "$0.50", 0 -> "$0.00"
 */
export function formatCents(cents: number): string {
  assertIntegerCents(cents, "cents");

  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainingCents = absCents % 100;
  const formattedDollars = dollars.toLocaleString("en-US");
  const formattedCents = remainingCents.toString().padStart(2, "0");

  const sign = isNegative ? "-" : "";
  return `${sign}$${formattedDollars}.${formattedCents}`;
}

/**
 * Safely parses a dollar input string into integer cents without float multiplication drift.
 * Handles "$180", "180.50", "0.99", etc.
 */
export function parseDollarsToCents(input: string): number {
  const cleaned = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!cleaned) {
    throw new Error("Cannot parse empty dollar string");
  }

  const parts = cleaned.split(".");
  if (parts.length > 2) {
    throw new Error(`Invalid dollar string format: "${input}"`);
  }

  const wholeStr = parts[0] || "0";
  const decimalStr = parts[1] || "";

  if (!/^\d+$/.test(wholeStr) || (decimalStr && !/^\d+$/.test(decimalStr))) {
    throw new Error(`Invalid numeric characters in dollar string: "${input}"`);
  }

  if (decimalStr.length > 2) {
    throw new Error(`Dollar string cannot have more than 2 decimal places: "${input}"`);
  }

  const whole = parseInt(wholeStr, 10);
  const cents = parseInt(decimalStr.padEnd(2, "0"), 10);

  const totalCents = whole * 100 + cents;
  if (!Number.isSafeInteger(totalCents)) {
    throw new RangeError(`Parsed cents exceeded safe integer bounds: "${input}"`);
  }

  return totalCents;
}
