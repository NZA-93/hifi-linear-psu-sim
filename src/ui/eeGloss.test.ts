import { describe, expect, it } from "vitest";
import { library } from "../library";
import {
  DROPOUT_GLOSS,
  IC_IDEAL_GLOSS,
  MODELED_LOW_DROP_BADGE,
  PEAK_CLAMP_GLOSS,
  SILICON_BRIDGE_GLOSS,
  TUBE_FWCT_GLOSS,
  isModeledLowDropPath,
  isPeakClampWarning,
  rectifierKindGloss,
  secondaryVacGloss,
} from "./eeGloss";
import { rectifierOptionLabel } from "./catalogLabels";

describe("Circuit Designer glosses (verbatim)", () => {
  it("keeps silicon / tube / IC / clamp / dropout wording exact", () => {
    expect(SILICON_BRIDGE_GLOSS).toBe(
      "Two diodes in the current path each half-cycle; secondary is ordinary two-wire RMS.",
    );
    expect(TUBE_FWCT_GLOSS).toBe(
      "Needs a centre-tapped secondary; the Vac you enter is RMS *per anode* (each half), not the full end-to-end.",
    );
    expect(PEAK_CLAMP_GLOSS).toBe(
      "Sim caps rectifier current at the part’s peak rating so the math doesn’t run away — a hit means real inrush/stress risk.",
    );
    expect(DROPOUT_GLOSS).toBe(
      "Regulator needs Vin above Vout by about this many volts at the *valley* of the ripple, or the rail collapses.",
    );
    expect(IC_IDEAL_GLOSS).toBe(
      "Near-zero diode drop (FET Rds); LT4320 ≈ full ideal bridge; LM74610 is a *modeled* low-drop path, not a drop-in four-FET AC bridge.",
    );
  });

  it("selects the gloss for the active rectifier kind", () => {
    expect(rectifierKindGloss("silicon-bridge")).toBe(SILICON_BRIDGE_GLOSS);
    expect(rectifierKindGloss("tube-fwct")).toBe(TUBE_FWCT_GLOSS);
    expect(rectifierKindGloss("ic-ideal-bridge")).toBe(IC_IDEAL_GLOSS);
  });

  it("attaches winding gloss to Vac only for silicon and tube", () => {
    expect(secondaryVacGloss("silicon-bridge")).toBe(SILICON_BRIDGE_GLOSS);
    expect(secondaryVacGloss("tube-fwct")).toBe(TUBE_FWCT_GLOSS);
    expect(secondaryVacGloss("ic-ideal-bridge")).toBeNull();
  });
});

describe("peak clamp + LM74610 modeled path", () => {
  it("recognizes the sim’s peak-clamp warning", () => {
    expect(
      isPeakClampWarning({
        level: "warn",
        message: "Rectifier peak current hits the 0.75 A clamp (saw 0.75 A).",
      }),
    ).toBe(true);
    expect(
      isPeakClampWarning({
        level: "error",
        message: "5AR4 / GZ34 is rated 0.25 A DC; load is 1 A.",
      }),
    ).toBe(false);
  });

  it("badges LM74610 as modeled low-drop path, not LT4320", () => {
    const lm = library.icRectifiers.find((p) => p.id === "lm74610")!;
    const lt = library.icRectifiers.find((p) => p.id === "lt4320")!;
    expect(isModeledLowDropPath(lm)).toBe(true);
    expect(isModeledLowDropPath(lt)).toBe(false);
    expect(rectifierOptionLabel(lm)).toContain(MODELED_LOW_DROP_BADGE);
    expect(rectifierOptionLabel(lt)).not.toContain(MODELED_LOW_DROP_BADGE);
    expect(rectifierOptionLabel(lm).startsWith("8 A / 45 V")).toBe(true);
  });
});
