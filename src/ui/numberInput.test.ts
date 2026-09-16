import { describe, expect, it } from "vitest";
import { formatCommitted, htmlStepMatches, parseNumberDraft, snapNumber } from "./numberInput";

describe("htmlStepMatches (Iload blocker)", () => {
  it("rejects Iload=1 with the old min=0.001 step=0.01 combo", () => {
    expect(htmlStepMatches(1, 0.001, 0.01)).toBe(false);
    expect(htmlStepMatches(0.991, 0.001, 0.01)).toBe(true);
    expect(htmlStepMatches(1.001, 0.001, 0.01)).toBe(true);
  });

  it("accepts round amps when step divides 1 (0.001) or is unused", () => {
    for (const amp of [1, 0.1, 0.5, 0.001]) {
      expect(htmlStepMatches(amp, 0.001, 0.001)).toBe(true);
    }
  });
});

describe("parseNumberDraft", () => {
  it("does not coerce empty or junk to 0", () => {
    expect(parseNumberDraft("")).toBeNull();
    expect(parseNumberDraft("   ")).toBeNull();
    expect(parseNumberDraft("nope")).toBeNull();
  });

  it("parses round amps and mid-edit decimals", () => {
    expect(parseNumberDraft("1")).toBe(1);
    expect(parseNumberDraft("0.1")).toBe(0.1);
    expect(parseNumberDraft("0.5")).toBe(0.5);
    expect(parseNumberDraft("1.")).toBe(1);
  });
});

describe("snapNumber", () => {
  it("keeps finite values including 1 / 0.1 / 0.5", () => {
    const opts = { min: 0.001, fallback: 1 };
    expect(snapNumber("1", opts)).toBe(1);
    expect(snapNumber("0.1", opts)).toBe(0.1);
    expect(snapNumber("0.5", opts)).toBe(0.5);
  });

  it("snaps empty or NaN required fields back to a finite fallback", () => {
    expect(snapNumber("", { min: 0.001, fallback: 1 })).toBe(1);
    expect(snapNumber("abc", { min: 0.001, fallback: 12 })).toBe(12);
  });

  it("clamps below-min junk to min on blur", () => {
    expect(snapNumber("0", { min: 0.001, fallback: 1 })).toBe(0.001);
  });

  it("allows optional fields to snap to null", () => {
    expect(snapNumber("", { optional: true, fallback: null })).toBeNull();
    expect(snapNumber("12.6", { optional: true, fallback: null })).toBe(12.6);
  });
});

describe("formatCommitted", () => {
  it("renders 1 as 1 not 1.001", () => {
    expect(formatCommitted(1)).toBe("1");
    expect(formatCommitted(null)).toBe("");
  });
});
