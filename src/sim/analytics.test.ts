import { describe, expect, it } from "vitest";
import { rectifierDropAt, reservoirRipplePp } from "./analytics";
import { rectifierModel } from "../library";
import { findRectifier } from "../library";

describe("reservoirRipplePp", () => {
  it("matches I / (2 f C) for full-wave 50 Hz", () => {
    const c = 10_000e-6;
    const v = reservoirRipplePp(1, 50, c, true);
    expect(v).toBeCloseTo(1 / (100 * 0.01), 10);
  });

  it("doubles when capacitance is halved", () => {
    const a = reservoirRipplePp(0.5, 60, 2200e-6, true);
    const b = reservoirRipplePp(0.5, 60, 1100e-6, true);
    expect(b).toBeCloseTo(2 * a, 10);
  });

  it("is twice as large for half-wave vs full-wave", () => {
    const fw = reservoirRipplePp(0.1, 50, 100e-6, true);
    const hw = reservoirRipplePp(0.1, 50, 100e-6, false);
    expect(hw).toBeCloseTo(2 * fw, 10);
  });
});

describe("rectifierDropAt", () => {
  it("counts two silicon drops for a 1N4007 bridge", () => {
    const m = rectifierModel(findRectifier("1n4007"));
    expect(m.vf0).toBeCloseTo(1.6, 6);
    expect(rectifierDropAt(m, 0)).toBeCloseTo(1.6, 6);
    expect(rectifierDropAt(m, 1)).toBeGreaterThan(1.6);
    expect(rectifierDropAt(m, 1)).toBeCloseTo(1.6 + m.rd, 6);
  });

  it("tube drop is much larger than silicon at 100 mA", () => {
    const si = rectifierModel(findRectifier("1n4007"));
    const tube = rectifierModel(findRectifier("5ar4-gz34"));
    expect(rectifierDropAt(tube, 0.1)).toBeGreaterThan(rectifierDropAt(si, 0.1) + 10);
  });

  it("IC ideal-bridge drop is millivolts at 1 A", () => {
    const ic = rectifierModel(findRectifier("lt4320"));
    const d = rectifierDropAt(ic, 1);
    expect(d).toBeLessThan(0.05);
  });
});
