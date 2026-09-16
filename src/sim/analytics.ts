import type { AnalyticEstimate, Architecture, FilterStage, RectifierModel, SpecInput } from "../types";
import { findRectifier, rectifierModel } from "../library";

/** Full-wave reservoir ripple (linear discharge between peaks). */
export function reservoirRipplePp(
  iload: number,
  mainsHz: number,
  cFarads: number,
  fullWave = true,
): number {
  if (cFarads <= 0) return Number.POSITIVE_INFINITY;
  const fRipple = (fullWave ? 2 : 1) * mainsHz;
  return iload / (fRipple * cFarads);
}

/** Two-diode silicon (or N-diode) forward drop at load current. */
export function rectifierDropAt(model: RectifierModel, iDc: number): number {
  return model.vf0 + model.rd * Math.max(0, iDc);
}

export function rippleTargetVolts(spec: SpecInput): number {
  if (spec.rippleUnit === "percent") return (spec.rippleValue / 100) * spec.vout;
  return spec.rippleValue / 1000;
}

export function secondaryRms(spec: SpecInput): number {
  if (spec.vsecRms !== null && spec.vsecRms > 0) return spec.vsecRms;
  if (
    spec.turnsPrimary !== null &&
    spec.turnsSecondary !== null &&
    spec.turnsPrimary > 0
  ) {
    return spec.mainsVac * (spec.turnsSecondary / spec.turnsPrimary);
  }
  return 0;
}

/** Transformer winding resistance from a simple % regulation model. */
export function transformerRs(vsecRms: number, iload: number, regulation: number): number {
  if (iload <= 0) return 0;
  return (vsecRms * regulation) / iload;
}

export function firstCapUf(stages: FilterStage[]): number {
  const cap = stages.find((s) => s.type === "cap");
  return cap && cap.type === "cap" ? cap.C_uF : 0;
}

export function seriesResistance(stages: FilterStage[]): number {
  let r = 0;
  for (const s of stages) {
    if (s.type === "resistor") r += s.R_ohm;
    if (s.type === "choke") r += s.DCR_ohm;
    if (s.type === "cap") r += s.ESR_ohm;
  }
  return r;
}

export function lastCapBeforeReg(stages: FilterStage[]): number {
  let c = 0;
  for (const s of stages) {
    if (s.type === "regulator") break;
    if (s.type === "cap") c = s.C_uF;
  }
  return c;
}

/**
 * CRC / CLC small-signal ripple attenuation at 2·f_mains, after the reservoir.
 * Treats series R or X_L into the following C as a first-order (RC) or LC divider.
 */
export function postFilterRippleAttenuation(
  stages: FilterStage[],
  mainsHz: number,
): number {
  const omega = 2 * Math.PI * 2 * mainsHz;
  let atten = 1;
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    if (s.type === "regulator") break;
    if (s.type !== "resistor" && s.type !== "choke") continue;
    const nextCap = stages.slice(i + 1).find((x) => x.type === "cap");
    if (!nextCap || nextCap.type !== "cap") continue;
    const c = nextCap.C_uF * 1e-6;
    if (s.type === "resistor") {
      const mag = Math.sqrt(1 + (omega * s.R_ohm * c) ** 2);
      atten /= mag;
    } else {
      const l = s.L_mH / 1000;
      const xc = 1 / (omega * c);
      const xl = omega * l;
      const mag = Math.sqrt(s.DCR_ohm ** 2 + (xl - xc) ** 2) / Math.max(xc, 1e-9);
      atten /= Math.max(mag, 1);
    }
  }
  return atten;
}

export function analyticEstimate(
  spec: SpecInput,
  arch: Architecture,
  model: RectifierModel,
  vsec: number,
): AnalyticEstimate {
  const vPeak = vsec * Math.SQRT2;
  const vfTotal = rectifierDropAt(model, spec.iload);
  const rs = transformerRs(vsec, spec.iload, spec.transformerRegulation) + model.rd;
  const c1 = firstCapUf(arch.stages) * 1e-6;
  const reservoirRipple = reservoirRipplePp(spec.iload, spec.mainsHz, c1);
  const seriesDrop = spec.iload * seriesResistance(arch.stages);
  const xfmrDrop = spec.iload * rs;
  const vdcNoLoad = vPeak - model.vf0;
  const vdcLoaded = vPeak - vfTotal - reservoirRipple / 2 - seriesDrop - xfmrDrop * 0.5;
  const atten = postFilterRippleAttenuation(arch.stages, spec.mainsHz);
  return {
    vPeak,
    vfTotal,
    vdcNoLoad,
    reservoirRipplePp: reservoirRipple,
    vdcLoaded,
    seriesDrop,
    rippleOutEstimate: reservoirRipple * atten,
  };
}

export function modelFromArch(arch: Architecture): RectifierModel {
  return rectifierModel(findRectifier(arch.rectifierId));
}
