import type { Architecture, FilterStage, RegulatorPart, SpecInput } from "../types";
import {
  findCapacitor,
  findChoke,
  findRegulator,
  findResistor,
  library,
  nearestCap,
  nearestChoke,
  nearestResistor,
  pickRegulator,
} from "../library";
import { rippleTargetVolts } from "./analytics";

let seq = 0;
function nid(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export function capStageFrom(partId: string, id?: string) {
  const p = findCapacitor(partId);
  return {
    id: id ?? nid("c"),
    type: "cap" as const,
    partId: p.id,
    C_uF: p.C_uF,
    ESR_ohm: p.ESR_ohm,
    Vdc_V: p.Vdc_V,
  };
}

export function resistorStageFrom(partId: string, id?: string) {
  const p = findResistor(partId);
  return {
    id: id ?? nid("r"),
    type: "resistor" as const,
    partId: p.id,
    R_ohm: p.R_ohm,
    Pmax_W: p.Pmax_W,
  };
}

export function chokeStageFrom(partId: string, id?: string) {
  const p = findChoke(partId);
  return {
    id: id ?? nid("l"),
    type: "choke" as const,
    partId: p.id,
    L_mH: p.L_mH,
    DCR_ohm: p.DCR_ohm,
    Imax_A: p.Imax_A,
  };
}

export function regulatorStageFrom(partId: string, vout: number, id?: string) {
  const p = findRegulator(partId);
  const vset = p.vfixed_V ?? vout;
  return {
    id: id ?? nid("reg"),
    type: "regulator" as const,
    partId: p.id,
    vset,
  };
}

function commonVac(v: number): number {
  const stock = [6, 9, 12, 15, 18, 24, 30, 48, 110, 150, 250, 275, 300, 350];
  const above = stock.filter((s) => s >= v - 0.4);
  return above[0] ?? Math.ceil(v);
}

export function suggestedSecondary(spec: SpecInput, rectifierId: string): number {
  const fromUser = spec.vsecRms;
  if (fromUser !== null && fromUser > 0) return fromUser;
  if (spec.turnsPrimary && spec.turnsSecondary && spec.turnsPrimary > 0) {
    return spec.mainsVac * (spec.turnsSecondary / spec.turnsPrimary);
  }

  const isTube = library.tubes.some((t) => t.id === rectifierId);
  const vf = isTube ? 20 : rectifierId.startsWith("lt") || rectifierId.startsWith("lm746") ? 0.05 : 1.8;
  const dropout = spec.includeRegulator ? 2.2 : 0;
  // Peak must clear Vout + dropout + headroom after diode drop, IR, and pulse-charging sag.
  const vPeakNeeded =
    spec.vout + dropout + spec.headroomV + vf + spec.iload * 1.2 + 2.5;
  return commonVac(vPeakNeeded / Math.SQRT2);
}

/**
 * Propose a capacitor-input CRC (or CLC on low-current rails) with optional series regulator.
 * Tight ripple budgets are met with a regulator + modest reservoir, not a 0.2 F capacitor.
 */
export function recommend(spec: SpecInput, rectifierId = "kbu8m"): Architecture {
  const ripple = rippleTargetVolts(spec);
  const vsec = suggestedSecondary(spec, rectifierId);
  const vPeak = vsec * Math.SQRT2;
  const useReg = spec.includeRegulator;
  const isTube = library.tubes.some((t) => t.id === rectifierId);

  const reservoirRippleAllow = useReg ? Math.max(0.8, spec.headroomV * 0.35) : Math.max(ripple * 4, 0.15);
  let c1_uF = (spec.iload / (2 * spec.mainsHz * reservoirRippleAllow)) * 1e6;
  c1_uF = Math.min(Math.max(c1_uF, 220), isTube ? 60 : 22000);
  if (isTube) c1_uF = Math.min(c1_uF, 60);

  const cap1 = nearestCap(c1_uF, vPeak);
  const cap2 = nearestCap(Math.max(c1_uF * 0.4, 470), vPeak);

  const stages: FilterStage[] = [capStageFrom(cap1.id, "c1")];

  const tubeStyle = isTube || spec.iload <= 0.25;
  if (tubeStyle && spec.iload <= 0.35) {
    const choke = nearestChoke(spec.iload, true);
    stages.push(chokeStageFrom(choke.id, "l1"));
  } else {
    const rTarget = Math.min(1.0, Math.max(0.22, 0.5 / Math.max(spec.iload, 0.1)));
    stages.push(resistorStageFrom(nearestResistor(rTarget).id, "r1"));
  }

  stages.push(capStageFrom(cap2.id, "c2"));

  if (useReg) {
    const reg = pickRegulator(spec.vout, spec.iload) as RegulatorPart;
    stages.push(regulatorStageFrom(reg.id, spec.vout, "reg1"));
  }

  return { rectifierId, stages };
}

export function defaultSpec(): SpecInput {
  return {
    vout: 12,
    iload: 1,
    rippleValue: 50,
    rippleUnit: "mVpp",
    mainsHz: 50,
    mainsVac: 230,
    vsecRms: null,
    turnsPrimary: null,
    turnsSecondary: null,
    headroomV: 3,
    transformerRegulation: 0.08,
    includeRegulator: true,
  };
}

/** Insert filter parts before a regulator. Series R/L go in front of the last cap so CLC/CRC stays well-posed. */
export function insertStage(arch: Architecture, stage: FilterStage): Architecture {
  const stages = [...arch.stages];
  const regIdx = stages.findIndex((s) => s.type === "regulator");
  const end = regIdx >= 0 ? regIdx : stages.length;
  const head = stages.slice(0, end);
  const tail = stages.slice(end);

  if (stage.type === "cap" || stage.type === "regulator") {
    return { ...arch, stages: [...head, stage, ...tail] };
  }

  let insertAt = head.length;
  for (let i = head.length - 1; i >= 0; i--) {
    if (head[i].type === "cap") {
      insertAt = i;
      break;
    }
  }
  if (insertAt === head.length) {
    head.push(stage, capStageFrom("eeufc1e222"));
  } else {
    head.splice(insertAt, 0, stage);
  }
  return { ...arch, stages: [...head, ...tail] };
}
