import { describe, expect, it } from "vitest";
import {
  normalizeAssetClass,
  normalizeDepKey,
  normalizePlantCode,
  toBool,
  toDateOrNull,
  toNumberOrNull,
  toTangibility,
} from "@/lib/excel-mapping";

describe("excel-mapping normalizers", () => {
  it("uppercases and trims plant/asset-class/dep-key", () => {
    expect(normalizePlantCode("rb01")).toBe("RB01");
    expect(normalizeAssetClass(" z005 ")).toBe("Z005");
    expect(normalizeDepKey("ckb6")).toBe("CKB6");
  });

  it("treats #N/A and NA as null in dep key and asset class", () => {
    expect(normalizeDepKey("NA")).toBeNull();
    expect(normalizeDepKey("#N/A")).toBeNull();
    expect(normalizeAssetClass("#N/A")).toBeNull();
  });

  it("parses workbook boolean-ish values", () => {
    expect(toBool("Yes")).toBe(true);
    expect(toBool("No - Still WIP")).toBe(false);
    expect(toBool("")).toBeNull();
    expect(toBool(null)).toBeNull();
  });

  it("parses numbers safely", () => {
    expect(toNumberOrNull("532738")).toBe(532738);
    expect(toNumberOrNull("")).toBeNull();
    expect(toNumberOrNull("not-a-number")).toBeNull();
  });

  it("parses dates safely", () => {
    const d = toDateOrNull(new Date("2024-03-31T00:00:00Z"));
    expect(d).toBeInstanceOf(Date);
    expect(toDateOrNull("")).toBeNull();
    expect(toDateOrNull("garbage")).toBeNull();
  });

  it("maps tangibility strings", () => {
    expect(toTangibility("Tangible")).toBe("TANGIBLE");
    expect(toTangibility("intangible")).toBe("INTANGIBLE");
    expect(toTangibility("unknown")).toBeNull();
  });
});
