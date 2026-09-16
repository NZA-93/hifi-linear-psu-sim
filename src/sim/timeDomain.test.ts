import { describe, expect, it } from "vitest";
import { defaultSpec, recommend } from "./recommend";
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
