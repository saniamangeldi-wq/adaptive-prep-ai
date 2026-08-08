import { describe, it, expect } from "vitest";
import {
  PDF_MAX_BYTES,
  figurePath,
  findExistingFigure,
  isFigureUsable,
  sanitizeFilename,
  sha256Hex,
  shouldQuarantineQuestion,
  sourcePdfPath,
  validatePdfFile,
} from "@/lib/sat-source-files";

describe("validatePdfFile", () => {
  it("accepts a normal pdf", () => {
    expect(validatePdfFile({ name: "test.pdf", type: "application/pdf", size: 1024 }).valid).toBe(true);
  });
  it("rejects non-pdf files", () => {
    expect(validatePdfFile({ name: "a.png", type: "image/png", size: 10 }).valid).toBe(false);
  });
  it("rejects empty and oversized files", () => {
    expect(validatePdfFile({ name: "a.pdf", type: "application/pdf", size: 0 }).valid).toBe(false);
    expect(validatePdfFile({ name: "a.pdf", type: "application/pdf", size: PDF_MAX_BYTES + 1 }).valid).toBe(false);
  });
});

describe("paths", () => {
  it("strips path traversal from filenames", () => {
    expect(sanitizeFilename("../../etc/passwd.pdf")).not.toContain("/");
  });
  it("builds deterministic paths", () => {
    expect(sourcePdfPath("abc", "SAT 1.pdf")).toBe("tests/abc/source/SAT_1.pdf");
    expect(figurePath("abc", "fig1", "png")).toBe("tests/abc/figures/fig1.png");
  });
});

describe("sha256Hex", () => {
  it("hashes deterministically", async () => {
    const bytes = new TextEncoder().encode("hello");
    const a = await sha256Hex(bytes);
    const b = await sha256Hex(new TextEncoder().encode("hello"));
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(a).not.toBe(await sha256Hex(new TextEncoder().encode("hello!")));
  });
});

describe("figure usability and quarantine", () => {
  const verified = { storage_path: "p", checksum_sha256: "c", extraction_status: "verified" };

  it("only trusts verified figures", () => {
    expect(isFigureUsable(verified)).toBe(true);
    expect(isFigureUsable({ ...verified, extraction_status: "uploaded" })).toBe(false);
    expect(isFigureUsable({ ...verified, storage_path: null })).toBe(false);
    expect(isFigureUsable(null)).toBe(false);
  });

  it("quarantines required visuals with no usable representation", () => {
    expect(shouldQuarantineQuestion({ visualRequired: true })).toBe(true);
    expect(shouldQuarantineQuestion({ visualRequired: true, figure: verified })).toBe(false);
    expect(shouldQuarantineQuestion({ visualRequired: true, hasStructuredData: true })).toBe(false);
    expect(shouldQuarantineQuestion({ visualRequired: false })).toBe(false);
  });

  it("reuses an existing asset with the same checksum", () => {
    const rows = [{ checksum_sha256: "x" }, { checksum_sha256: "y" }];
    expect(findExistingFigure(rows, "y")).toBe(rows[1]);
    expect(findExistingFigure(rows, "z")).toBeUndefined();
  });
});
