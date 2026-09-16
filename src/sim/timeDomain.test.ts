import { describe, expect, it } from "vitest";
import {
  capStageFrom,
  defaultSpec,
  recommend,
  regulatorStageFrom,
  resistorStageFrom,
} from "./recommend";
import { simulate } from "./timeDomain";
import { reservoirRipplePp } from "./analytics";

describe("time-domain simulate", () => {
  it("produces a plausible 12 V regulated rail for the demo spec", () => {
    const spec = defaultSpec();
    const arch = recommend(spec, "kbu8m");
    const { metrics } = simulate(spec, arch);
    expect(metrics.vsecUsed).toBeGreaterThan(12);
    expect(metrics.voutAvg).toBeGreaterThan(11.2);
    expect(metrics.voutAvg).toBeLessThan(13.5);
    expect(metrics.inRegulation).toBe(true);
    expect(metrics.rippleOutPp).toBeLessThan(0.08);
    expect(metrics.pRegulator_W).toBeGreaterThan(0.5);
  });

  it("updates numbers when swapping to a tube rectifier", () => {
    const spec = defaultSpec();
    const silicon = simulate(spec, recommend(spec, "kbu8m"));
    const tubeArch = recommend(spec, "kbu8m");
    tubeArch.rectifierId = "5ar4-gz34";
    const tube = simulate(spec, tubeArch);
    expect(tube.metrics.vPreRegAvg).toBeLessThan(silicon.metrics.vPreRegAvg - 5);
    expect(tube.metrics.warnings.some((w) => w.message.includes("5AR4") || w.message.includes("rated"))).toBe(
      true,
    );
  });

  it("adding a choke increases series drop", () => {
    const spec = defaultSpec();
    spec.includeRegulator = false;
    spec.vsecRms = 18;
    const arch = recommend(spec, "kbu8m");
    const before = simulate(spec, arch);
    arch.stages.splice(1, 0, {
      id: "l-test",
      type: "choke",
      partId: "bourns-1140-102k",
      L_mH: 1,
      DCR_ohm: 0.286,
      Imax_A: 5.5,
    });
    const after = simulate(spec, arch);
    expect(after.metrics.pSeries_W).toBeGreaterThan(before.metrics.pSeries_W);
  });

  it("reservoir ripple is within 40% of the I/(2fC) estimate", () => {
    const spec = defaultSpec();
    spec.includeRegulator = false;
    spec.vsecRms = 18;
    spec.iload = 0.5;
    const arch = recommend(spec, "kbu8m");
    arch.stages = arch.stages.filter((s) => s.type === "cap").slice(0, 1);
    const cap = arch.stages[0];
    if (cap.type !== "cap") throw new Error("expected cap");
    const { metrics } = simulate(spec, arch);
    const analytic = reservoirRipplePp(spec.iload, spec.mainsHz, cap.C_uF * 1e-6);
    expect(metrics.ripplePreRegPp).toBeGreaterThan(analytic * 0.6);
    expect(metrics.ripplePreRegPp).toBeLessThan(analytic * 1.4);
  });

  it("stays finite if a choke is appended after the regulator", () => {
    const spec = defaultSpec();
    const arch = recommend(spec, "kbu8m");
    arch.stages.push({
      id: "l-tail",
      type: "choke",
      partId: "bourns-1140-102k",
      L_mH: 1,
      DCR_ohm: 0.286,
      Imax_A: 5.5,
    });
    const { metrics } = simulate(spec, arch);
    expect(Number.isFinite(metrics.vPreRegAvg)).toBe(true);
    expect(Math.abs(metrics.vPreRegAvg)).toBeLessThan(80);
    expect(metrics.voutAvg).toBeGreaterThan(10);
  });
});

describe("electrical honesty", () => {
  it("PSRR does not grow Vout with DC headroom", () => {
    const spec = defaultSpec();
    spec.includeRegulator = true;
    spec.iload = 0.4;
    spec.vout = 12;
    const arch = recommend(spec, "kbu8m");
    arch.stages = arch.stages.map((s) =>
      s.type === "regulator" ? regulatorStageFrom("tip3055-zener", 12.3, s.id) : s,
    );

    spec.vsecRms = 18;
    const low = simulate(spec, arch);
    spec.vsecRms = 30;
    const high = simulate(spec, arch);

    expect(low.metrics.inRegulation).toBe(true);
    expect(high.metrics.inRegulation).toBe(true);
    expect(low.metrics.voutAvg).toBeGreaterThan(11.8);
    expect(low.metrics.voutAvg).toBeLessThan(12.8);
    expect(high.metrics.voutAvg).toBeGreaterThan(11.8);
    expect(high.metrics.voutAvg).toBeLessThan(12.8);
    // Old model added (vPre − vset − dropout)·PSRR, ~0.8 V extra between these rails at 20 dB.
    expect(Math.abs(high.metrics.voutAvg - low.metrics.voutAvg)).toBeLessThan(0.15);
    expect(high.metrics.vPreRegAvg - low.metrics.vPreRegAvg).toBeGreaterThan(8);
  });

  it("warns VRRM on high Vsec + 1N5822", () => {
    const spec = defaultSpec();
    spec.includeRegulator = false;
    spec.iload = 0.5;
    spec.vsecRms = 22;
    const arch = recommend(spec, "1n5822");
    arch.rectifierId = "1n5822";
    const { metrics } = simulate(spec, arch);
    const vpeak = 22 * Math.SQRT2;
    expect(vpeak).toBeGreaterThan(0.7 * 40);
    expect(vpeak).toBeLessThan(0.9 * 40);
    expect(
      metrics.warnings.some((w) => w.level === "warn" && /VRRM/i.test(w.message) && /1N5822/.test(w.message)),
    ).toBe(true);
    expect(metrics.warnings.some((w) => w.level === "error" && /VRRM/i.test(w.message))).toBe(false);
  });

  it("errors VRRM at ≥90% on 1N5822", () => {
    const spec = defaultSpec();
    spec.includeRegulator = false;
    spec.vsecRms = 30;
    const arch = recommend(spec, "1n5822");
    arch.rectifierId = "1n5822";
    const { metrics } = simulate(spec, arch);
    expect(metrics.warnings.some((w) => w.level === "error" && /VRRM/i.test(w.message))).toBe(true);
  });

  it("surfaces Isec_rms and VA fields (tube VA is 2× half-winding)", () => {
    const spec = defaultSpec();
    spec.iload = 1;
    spec.vsecRms = 18;
    const silicon = simulate(spec, recommend(spec, "kbu8m"));
    expect(silicon.metrics.iSecRms).toBeCloseTo(1.8, 6);
    expect(silicon.analytic.iSecRms).toBeCloseTo(1.8, 6);
    expect(silicon.metrics.transformerVa).toBeCloseTo(18 * 1.8, 6);
    expect(silicon.analytic.transformerVa).toBeCloseTo(silicon.metrics.transformerVa, 6);
    expect(silicon.metrics.warnings.some((w) => /Isec\(rms\)/.test(w.message) && /not SPICE/.test(w.message))).toBe(
      true,
    );

    const tubeArch = recommend(spec, "kbu8m");
    tubeArch.rectifierId = "5ar4-gz34";
    const tube = simulate(spec, tubeArch);
    expect(tube.metrics.iSecRms).toBeCloseTo(1.8, 6);
    expect(tube.metrics.transformerVa).toBeCloseTo(2 * tube.metrics.vsecUsed * 1.8, 6);
    expect(tube.metrics.heaterOmitted_W).toBeCloseTo(5.0 * 1.9, 6);
    expect(tube.metrics.warnings.some((w) => /heater/.test(w.message) && /not SPICE/.test(w.message))).toBe(true);
  });

  it("C1 overvoltage uses first-node peak, not post-CRC vPreMax", () => {
    const spec = defaultSpec();
    spec.includeRegulator = false;
    spec.iload = 1;
    spec.vsecRms = 30;
    const arch = {
      rectifierId: "kbu8m",
      stages: [
        capStageFrom("ukw1v472mhd", "c1"),
        resistorStageFrom("20j10r", "r1"),
        capStageFrom("ukw1v472mhd", "c2"),
      ],
    };
    const { metrics } = simulate(spec, arch);
    expect(metrics.vFirstCapMax).toBeGreaterThan(35);
    expect(metrics.vPreRegMax).toBeLessThan(metrics.vFirstCapMax - 4);
    expect(metrics.vPreRegMax).toBeLessThan(35);
    expect(
      metrics.warnings.some(
        (w) =>
          w.level === "error" &&
          /First capacitor/.test(w.message) &&
          /first-node peak/.test(w.message) &&
          /ukw1v472mhd/.test(w.message),
      ),
    ).toBe(true);
  });
});
