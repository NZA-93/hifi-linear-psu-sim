import type { ComponentLibrary, RectifierModel, RectifierPart } from "../types";
import libraryJson from "./components.json";

export const library = libraryJson as ComponentLibrary;

export function allRectifiers(): RectifierPart[] {
  return [...library.diodes, ...library.tubes, ...library.icRectifiers];
}

export function findRectifier(id: string): RectifierPart {
  const part = allRectifiers().find((p) => p.id === id);
  if (!part) throw new Error(`Unknown rectifier '${id}'`);
  return part;
}

export function findCapacitor(id: string) {
  const part = library.capacitors.find((p) => p.id === id);
  if (!part) throw new Error(`Unknown capacitor '${id}'`);
  return part;
}

export function findResistor(id: string) {
  const part = library.resistors.find((p) => p.id === id);
  if (!part) throw new Error(`Unknown resistor '${id}'`);
  return part;
}

export function findChoke(id: string) {
  const part = library.chokes.find((p) => p.id === id);
  if (!part) throw new Error(`Unknown choke '${id}'`);
  return part;
}

export function findRegulator(id: string) {
  const part = library.regulators.find((p) => p.id === id);
  if (!part) throw new Error(`Unknown regulator '${id}'`);
  return part;
}

export function rectifierModel(part: RectifierPart): RectifierModel {
  const diodesInPath = "diodesInPath" in part ? part.diodesInPath : 1;
  return {
    id: part.id,
    label: part.mpn,
    kind: part.kind,
    vf0: part.vf0_V * diodesInPath,
    rd: part.rd_ohm * diodesInPath,
    iPeakMax: part.iPeakMax_A,
    iDcMax: part.iAvgMax_A,
    vRrm: part.vRrm_V,
    iFsm: part.iFsm_A,
    cinMax_uF: "cinMax_uF" in part ? part.cinMax_uF : undefined,
    heater_W: "heater_V" in part ? part.heater_V * part.heater_A : undefined,
  };
}

export function nearestCap(c_uF: number, vdcMin: number) {
  const candidates = library.capacitors.filter((c) => c.Vdc_V >= vdcMin);
  const pool = candidates.length > 0 ? candidates : library.capacitors;
  return pool.reduce((best, c) =>
    Math.abs(c.C_uF - c_uF) < Math.abs(best.C_uF - c_uF) ? c : best,
  );
}

export function nearestResistor(r: number) {
  return library.resistors.reduce((best, x) =>
    Math.abs(x.R_ohm - r) < Math.abs(best.R_ohm - r) ? x : best,
  );
}

export function nearestChoke(iMax: number, preferHenries: boolean) {
  const rated = library.chokes.filter((c) => c.Imax_A + 1e-9 >= iMax);
  const pool = rated.length > 0 ? rated : library.chokes;
  if (preferHenries) {
    return pool.reduce((best, c) => (c.L_mH > best.L_mH ? c : best));
  }
  return pool.reduce((best, c) => (c.DCR_ohm < best.DCR_ohm ? c : best));
}

export function pickRegulator(vout: number, iload: number) {
  const regs = library.regulators.filter(
    (r) => r.iMax_A >= iload && vout >= r.voutMin_V && vout <= r.voutMax_V,
  );
  const fixed = regs.find((r) => r.vfixed_V !== null && Math.abs(r.vfixed_V - vout) < 0.15);
  if (fixed) return fixed;
  const adj = regs.find((r) => r.topology === "ic-adjustable");
  if (adj) return adj;
  return regs[0] ?? library.regulators[0];
}
