import { describe, expect, it } from "vitest";
import { chokeStageFrom, defaultSpec, insertStage, recommend } from "./recommend";
import { library } from "../library";

describe("recommend", () => {
  it("suggests diode + CRC + regulator for 12 V / 1 A / 50 mV", () => {
    const spec = defaultSpec();
    const arch = recommend(spec, "kbu8m");
    expect(arch.rectifierId).toBe("kbu8m");
    const types = arch.stages.map((s) => s.type);
    expect(types[0]).toBe("cap");
    expect(types).toContain("resistor");
    expect(types.filter((t) => t === "cap").length).toBeGreaterThanOrEqual(2);
    expect(types).toContain("regulator");
  });

  it("uses a choke on a low-current tube-style rail", () => {
    const spec = defaultSpec();
    spec.vout = 250;
    spec.iload = 0.05;
    spec.includeRegulator = false;
    spec.vsecRms = 275;
    const arch = recommend(spec, "5ar4-gz34");
    expect(arch.stages.some((s) => s.type === "choke")).toBe(true);
    const c1 = arch.stages.find((s) => s.type === "cap");
    expect(c1 && c1.type === "cap" && c1.C_uF).toBeLessThanOrEqual(100);
  });

  it("library has 15+ real catalog entries", () => {
    const n =
      library.diodes.length +
      library.tubes.length +
      library.icRectifiers.length +
      library.capacitors.length +
      library.chokes.length +
      library.resistors.length +
      library.regulators.length;
    expect(n).toBeGreaterThanOrEqual(15);
  });

  it("inserts a choke before the last capacitor, not after the regulator", () => {
    const arch = recommend(defaultSpec(), "kbu8m");
    const next = insertStage(arch, chokeStageFrom("bourns-1140-102k", "l-add"));
    const types = next.stages.map((s) => s.type);
    expect(types[types.length - 1]).toBe("regulator");
    expect(types).toContain("choke");
    const chokeAt = types.indexOf("choke");
    expect(types[chokeAt + 1]).toBe("cap");
  });
});
