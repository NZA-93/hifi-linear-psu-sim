import { describe, expect, it } from "vitest";
import {
  analyticEstimate,
  chargingPathOhms,
  rectifierDropAt,
  reservoirRipplePp,
  seriesResistance,
  transformerRs,
} from "./analytics";
import { rectifierModel } from "../library";
import { findRectifier } from "../library";
import { defaultSpec, recommend } from "./recommend";

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

describe("Rd consistency (analytic vs drop helper)", () => {
  it("vfTotal matches rectifierDropAt and does not add Rd again into winding IR", () => {
    const spec = defaultSpec();
    spec.iload = 1;
    spec.vsecRms = 18;
    const arch = recommend(spec, "1n4007");
    const model = rectifierModel(findRectifier("1n4007"));
    const a = analyticEstimate(spec, arch, model, 18);

    expect(a.vfTotal).toBeCloseTo(rectifierDropAt(model, spec.iload), 10);
    expect(model.rd).toBeGreaterThan(0.05);

    const rsX = transformerRs(18, spec.iload, spec.transformerRegulation);
    expect(a.xfmrDrop).toBeCloseTo(spec.iload * rsX * 0.5, 10);
    // Old bug: rs = rsX + model.rd made xfmrDrop include another 0.5·I·Rd.
    expect(a.xfmrDrop).toBeLessThan(spec.iload * (rsX + model.rd) * 0.5 - 1e-9);

    const rCharge = chargingPathOhms(model, rsX, 0.04);
    expect(rCharge).toBeCloseTo(rsX + model.rd + 0.04, 10);
    expect(rCharge).not.toBeCloseTo(rsX + model.rd * 0.25 + 0.04, 3);
  });

  it("seriesResistance omits capacitor ESR (ripple path, not DC IR)", () => {
    const spec = defaultSpec();
    const arch = recommend(spec, "kbu8m");
    const esrSum = arch.stages
      .filter((s) => s.type === "cap")
      .reduce((sum, s) => (s.type === "cap" ? sum + s.ESR_ohm : sum), 0);
    const rDc = seriesResistance(arch.stages);
    expect(esrSum).toBeGreaterThan(0);
    const rAndDcr = arch.stages.reduce((sum, s) => {
      if (s.type === "resistor") return sum + s.R_ohm;
      if (s.type === "choke") return sum + s.DCR_ohm;
      return sum;
    }, 0);
    expect(rDc).toBeCloseTo(rAndDcr, 10);
    expect(rDc).toBeLessThan(rAndDcr + esrSum);
  });
});
