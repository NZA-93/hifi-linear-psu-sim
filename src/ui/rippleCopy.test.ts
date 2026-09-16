import { describe, expect, it } from "vitest";
import { defaultSpec } from "../sim/recommend";
import { formatRippleTarget, rippleMeetsTarget, rippleVsTargetLabel } from "./rippleCopy";

describe("ripple vs target copy", () => {
  it("uses the user's mVpp target, not a hidden band", () => {
    const spec = defaultSpec();
    expect(formatRippleTarget(spec)).toBe("50 mVpp");
    expect(rippleVsTargetLabel(0.04, spec)).toBe("under target (50 mVpp)");
    expect(rippleVsTargetLabel(0.06, spec)).toBe("over target (50 mVpp)");
    expect(rippleMeetsTarget(0.05, spec)).toBe(true);
    expect(rippleMeetsTarget(0.0501, spec)).toBe(false);
  });

  it("formats percent-of-Vout targets", () => {
    const spec = { ...defaultSpec(), rippleUnit: "percent" as const, rippleValue: 1 };
    expect(formatRippleTarget(spec)).toBe("1% of Vout");
    expect(rippleVsTargetLabel(0.2, spec)).toBe("over target (1% of Vout)");
  });
});
