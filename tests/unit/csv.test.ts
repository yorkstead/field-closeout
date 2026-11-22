import { describe, expect, it } from "bun:test";
import { sanitizeCsvCell, serializeToCsv } from "../../src/lib/csv";

describe("csv utilities", () => {
  describe("sanitizeCsvCell", () => {
    it("handles simple text and numbers without modification", () => {
      expect(sanitizeCsvCell("Simple text")).toBe("Simple text");
      expect(sanitizeCsvCell(18000)).toBe("18000");
      expect(sanitizeCsvCell(null)).toBe("");
      expect(sanitizeCsvCell(undefined)).toBe("");
    });

    it("escapes formula injection prefixes with leading single-quote", () => {
      expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvCell("+12345")).toBe("'+12345");
      expect(sanitizeCsvCell("-500")).toBe("'-500");
      expect(sanitizeCsvCell("@cmd")).toBe("'@cmd");
    });

    it("quotes cells containing commas, quotes, and newlines", () => {
      expect(sanitizeCsvCell("Hello, world")).toBe('"Hello, world"');
      expect(sanitizeCsvCell('He said "hello"')).toBe('"He said ""hello"""');
      expect(sanitizeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    });

    it("handles combination of formula injection and quoting", () => {
      expect(sanitizeCsvCell('=HYPERLINK("http://evil.com", "Click")')).toBe(
        '"\'=HYPERLINK(""http://evil.com"", ""Click"")"'
      );
    });
  });

  describe("serializeToCsv", () => {
    it("serializes rows to RFC-4180 CSV with CRLF endings", () => {
      const headers = ["Job #", "Customer", "Amount", "Notes"];
      const rows = [
        ["JOB-101", "Alex Rivera", "$180.00", "Normal note"],
        ["JOB-102", "Jordan, Bennett", "$650.00", "Notes with, comma"],
        ["JOB-103", "=DANGEROUS()", "$320.00", "Formula test"],
      ];

      const csv = serializeToCsv(headers, rows);
      expect(csv).toContain("Job #,Customer,Amount,Notes\r\n");
      expect(csv).toContain('JOB-102,"Jordan, Bennett",$650.00,"Notes with, comma"\r\n');
      expect(csv).toContain("JOB-103,'=DANGEROUS(),$320.00,Formula test\r\n");
    });
  });
});
