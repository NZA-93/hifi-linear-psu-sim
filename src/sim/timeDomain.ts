import type {
  Architecture,
  FilterStage,
  SimMetrics,
  SimResult,
  SpecInput,
  Warning,
  Waveform,
} from "../types";
import { findRegulator } from "../library";
import {
  analyticEstimate,
  chargingPathOhms,
  firstCapEsr,
  IFSM_WARN_FRACTION,
  ifsmAmps,
  modelFromArch,
  rectifierDropAt,
  rectifierReversePeak,
  rippleTargetVolts,
  secondaryRms,
  transformerRs,
  VRRM_ERROR_FRACTION,
  VRRM_WARN_FRACTION,
} from "./analytics";
import { suggestedSecondary } from "./recommend";

interface NodeCap {
  C: number;
  esr: number;
}

interface SeriesArm {
  R: number;
  L: number;
}

interface Ladder {
  nodes: NodeCap[];
  series: SeriesArm[];
  regulator: { partId: string; vset: number } | null;
}

function buildLadder(stages: FilterStage[]): Ladder {
  const nodes: NodeCap[] = [];
  const series: SeriesArm[] = [];
  let regulator: Ladder["regulator"] = null;

  const ensureNode = () => {
    if (nodes.length === 0) nodes.push({ C: 0, esr: 0 });
  };

  for (const s of stages) {
    if (s.type === "regulator") {
      regulator = { partId: s.partId, vset: s.vset };
      continue;
    }
    if (s.type === "cap") {
      ensureNode();
      const n = nodes[nodes.length - 1];
      n.C += s.C_uF * 1e-6;
      n.esr = n.C > 0 ? (n.esr * (n.C - s.C_uF * 1e-6) + s.ESR_ohm * s.C_uF * 1e-6) / n.C : s.ESR_ohm;
    } else {
      if (nodes.length === 0) nodes.push({ C: 0, esr: 0 });
      series.push({
        R: s.type === "resistor" ? s.R_ohm : s.DCR_ohm,
        L: s.type === "choke" ? s.L_mH / 1000 : 0,
      });
      nodes.push({ C: 0, esr: 0 });
    }
  }

  if (nodes.length === 0) nodes.push({ C: 100e-6, esr: 0.05 });

  // A series L/R with no following C is ill-posed against a current-source load.
  // Fold a trailing empty node into a modest filter cap rather than 2 nF (which rings at MHz).
  while (nodes.length > 1 && nodes[nodes.length - 1].C < 1e-8) {
    const arm = series[series.length - 1];
    if (arm && arm.L > 1e-8) {
      nodes[nodes.length - 1] = { C: 47e-6, esr: 0.05 };
      break;
    }
    nodes.pop();
    const dropped = series.pop();
    if (dropped && series.length > 0) series[series.length - 1].R += dropped.R;
    else if (dropped) nodes[nodes.length - 1].esr += dropped.R;
  }
  for (const n of nodes) {
    if (n.C < 1e-10) n.C = 47e-6;
  }
  return { nodes, series, regulator };
}

export function resolveVsec(spec: SpecInput, rectifierId: string): number {
  const explicit = secondaryRms(spec);
  if (explicit > 0) return explicit;
  return suggestedSecondary(spec, rectifierId);
}

function capNodeIndex(stages: FilterStage[], capId: string): number {
  let nodeIdx = 0;
  for (const s of stages) {
    if (s.type === "regulator") break;
    if (s.type === "cap") {
      if (s.id === capId) return nodeIdx;
    } else {
      nodeIdx += 1;
    }
  }
  return 0;
}

export function simulate(spec: SpecInput, arch: Architecture): SimResult {
  const model = modelFromArch(arch);
  const vsec = resolveVsec(spec, arch.rectifierId);
  const analytic = analyticEstimate(spec, arch, model, vsec);
  const ladder = buildLadder(arch.stages);
  const rsX = transformerRs(vsec, spec.iload, spec.transformerRegulation);
  const rCharge = chargingPathOhms(model, rsX, ladder.nodes[0]?.esr ?? firstCapEsr(arch.stages));

  const f = spec.mainsHz;
  const cycles = 14;
  const stepsPerCycle = 800;
  const dt = 1 / (f * stepsPerCycle);
  const nSteps = cycles * stepsPerCycle;
  const omega = 2 * Math.PI * f;
  const vPeak = vsec * Math.SQRT2;

  const v = ladder.nodes.map(() => Math.max(analytic.vdcLoaded, 0));
  const iS = ladder.series.map(() => spec.iload);
  const last = v.length - 1;

  const regPart = ladder.regulator ? findRegulator(ladder.regulator.partId) : null;
  const dropout = regPart?.dropout_V ?? 0;
  const vset = ladder.regulator?.vset ?? spec.vout;
  const psrrLin = regPart ? 10 ** (-regPart.psrr_dB / 20) : 1;
  const iq = regPart?.iq_A ?? 0;

  const recordFrom = (cycles - 2) * stepsPerCycle;
  const waveform: Waveform = { t: [], vRect: [], vFirstCap: [], vPreReg: [], vOut: [], iRect: [] };

  let pRectAcc = 0;
  let pRegAcc = 0;
  let samples = 0;
  let vPreAcc = 0;
  let vOutAcc = 0;
  let vPreMin = Infinity;
  let vPreMax = -Infinity;
  let vOutMin = Infinity;
  let vOutMax = -Infinity;
  let iPeakSeen = 0;
  let iPeakUnclamped = 0;
  let iPeakFirstCycle = 0;
  const vNodeMax = ladder.nodes.map(() => -Infinity);
  let firstCap = ladder.nodes[0].C;

  // Empty-C first-cycle inrush (order-of-magnitude; sim itself warm-starts at analytic Vdc).
  const iInrushUnclamped = Math.max(0, (vPeak - model.vf0) / rCharge);
  iPeakUnclamped = iInrushUnclamped;
  iPeakFirstCycle = iInrushUnclamped;

  let vPreMean = Math.max(analytic.vdcLoaded, 0);
  let vPreCycleSum = 0;
  let stepsInCycle = 0;

  for (let k = 0; k < nSteps; k++) {
    const t = k * dt;
    const vIdeal = Math.abs(vPeak * Math.sin(omega * t));
    const vTh = Math.max(0, vIdeal - model.vf0);

    let iDesire = (vTh - v[0]) / rCharge;
    if (iDesire < 0) iDesire = 0;
    let iRect = iDesire;
    if (iRect > model.iPeakMax) iRect = model.iPeakMax;
    iPeakUnclamped = Math.max(iPeakUnclamped, iDesire);
    if (k < stepsPerCycle) iPeakFirstCycle = Math.max(iPeakFirstCycle, iDesire);

    for (let i = 0; i < ladder.series.length; i++) {
      const arm = ladder.series[i];
      const dv = v[i] - v[i + 1];
      if (arm.L > 1e-8) {
        iS[i] = (iS[i] + (dt / arm.L) * dv) / (1 + (dt * arm.R) / arm.L);
      } else {
        iS[i] = dv / Math.max(arm.R, 1e-4);
      }
    }

    const vPre = v[last];
    let iLoadPre = spec.iload;
    let vOut = vPre;
    if (regPart) {
      iLoadPre = spec.iload + iq;
      const ceiling = vPre - dropout;
      if (ceiling >= vset) {
        // PSRR is AC-only: DC headroom must not lift Vout above Vset.
        vOut = vset + (vPre - vPreMean) * psrrLin;
      } else {
        vOut = Math.max(0, ceiling);
      }
    }

    vPreCycleSum += vPre;
    stepsInCycle += 1;
    if (stepsInCycle >= stepsPerCycle) {
      vPreMean = vPreCycleSum / stepsInCycle;
      vPreCycleSum = 0;
      stepsInCycle = 0;
    }

    for (let n = 0; n < v.length; n++) {
      let iCap = 0;
      if (n === 0) iCap += iRect;
      else iCap += iS[n - 1];
      if (n < ladder.series.length) iCap -= iS[n];
      if (n === last) iCap -= iLoadPre;
      v[n] += (iCap * dt) / ladder.nodes[n].C;
      if (!Number.isFinite(v[n]) || v[n] > 1e5) v[n] = Math.min(Math.max(v[n] || 0, 0), 1e5);
      if (v[n] < 0) v[n] = 0;
      vNodeMax[n] = Math.max(vNodeMax[n], v[n]);
    }
    for (let i = 0; i < iS.length; i++) {
      if (!Number.isFinite(iS[i]) || Math.abs(iS[i]) > 1e4) iS[i] = Math.sign(iS[i] || 0) * 1e4;
    }

    if (k >= recordFrom) {
      waveform.t.push(t - recordFrom * dt);
      waveform.vRect.push(vTh);
      waveform.vFirstCap.push(v[0]);
      waveform.vPreReg.push(vPre);
      waveform.vOut.push(vOut);
      waveform.iRect.push(iRect);
      vPreAcc += vPre;
      vOutAcc += vOut;
      vPreMin = Math.min(vPreMin, vPre);
      vPreMax = Math.max(vPreMax, vPre);
      vOutMin = Math.min(vOutMin, vOut);
      vOutMax = Math.max(vOutMax, vOut);
      pRectAcc += iRect * rectifierDropAt(model, iRect) * dt;
      if (regPart) pRegAcc += Math.max(0, vPre - vOut) * spec.iload * dt;
      iPeakSeen = Math.max(iPeakSeen, iRect);
      samples += 1;
    }
  }

  const duration = samples * dt;
  const vPreAvg = vPreAcc / samples;
  const vOutAvg = vOutAcc / samples;
  const ripplePre = vPreMax - vPreMin;
  const rippleOut = vOutMax - vOutMin;
  const pRect = pRectAcc / duration;
  const pReg = pRegAcc / duration;
  let pSeries = 0;
  for (const s of arch.stages) {
    if (s.type === "resistor") pSeries += spec.iload ** 2 * s.R_ohm;
    if (s.type === "choke") pSeries += spec.iload ** 2 * s.DCR_ohm;
  }
  const pHeat = pRect + pReg + pSeries;
  const pOut = spec.vout * spec.iload;
  const headroomMin = (regPart ? vPreMin - dropout : vPreMin) - vset;
  const inRegulation = !regPart || vPreMin >= vset + dropout;
  const vFirstCapMax = vNodeMax[0] ?? vPreMax;
  const heaterOmitted_W = model.heater_W ?? 0;

  const warnings: Warning[] = [];
  warnings.push({
    level: "warn",
    message:
      model.kind === "tube-fwct"
        ? `Isec(rms) ≈ 1.8×Idc = ${analytic.iSecRms.toFixed(2)} A per half-winding; transformer VA ≈ ${analytic.transformerVa.toFixed(0)} VA (2×Vsec×Isec_rms for FW-CT). Rule of thumb for cap-input sizing, not SPICE.`
        : `Isec(rms) ≈ 1.8×Idc = ${analytic.iSecRms.toFixed(2)} A; transformer VA ≈ ${analytic.transformerVa.toFixed(0)} VA (Vsec×Isec_rms). Rule of thumb for cap-input sizing, not SPICE.`,
  });

  if (spec.iload > model.iDcMax) {
    warnings.push({
      level: "error",
      message: `${model.label} is rated ${model.iDcMax} A DC; load is ${spec.iload} A.`,
    });
  }

  const { iFsm, mappedFromPeakClamp } = ifsmAmps(model);
  if (iPeakFirstCycle >= IFSM_WARN_FRACTION * iFsm) {
    const mapped =
      mappedFromPeakClamp
        ? " IFSM mapped from the library peak-current rating (datasheet IFSM not entered separately)."
        : "";
    warnings.push({
      level: "warn",
      message: `First-cycle peak ${iPeakFirstCycle.toFixed(2)} A is ≥ 70% of IFSM (${iFsm} A).${mapped} Rule of thumb, not SPICE.`,
    });
  }

  if (iPeakUnclamped >= model.iPeakMax) {
    warnings.push({
      level: "warn",
      message: `Rectifier peak current hits the ${model.iPeakMax} A clamp (unclamped desire ${iPeakUnclamped.toFixed(2)} A). Rule of thumb, not SPICE.`,
    });
  }

  const vReverse = rectifierReversePeak(model.kind, vPeak);
  if (vReverse >= VRRM_ERROR_FRACTION * model.vRrm) {
    warnings.push({
      level: "error",
      message: `Rectified peak ${vReverse.toFixed(1)} V is ≥ 90% of VRRM (${model.vRrm} V) for ${model.label}.`,
    });
  } else if (vReverse >= VRRM_WARN_FRACTION * model.vRrm) {
    warnings.push({
      level: "warn",
      message: `Rectified peak ${vReverse.toFixed(1)} V is ≥ 70% of VRRM (${model.vRrm} V) for ${model.label}. Rule of thumb, not SPICE.`,
    });
  }

  if (model.cinMax_uF !== undefined && firstCap > (model.cinMax_uF + 1) * 1e-6) {
    warnings.push({
      level: "warn",
      message: `First capacitor ${(firstCap * 1e6).toFixed(0)} µF exceeds typical ${model.cinMax_uF} µF Cin max for ${model.label}.`,
    });
  }
  if (regPart && !inRegulation) {
    warnings.push({
      level: "error",
      message: `Regulator dropout: raw valley ${vPreMin.toFixed(2)} V is below ${vset.toFixed(2)} V + ${dropout.toFixed(2)} V dropout.`,
    });
  }
  if (rippleOut > rippleTargetVolts(spec) * 1.15) {
    warnings.push({
      level: "warn",
      message: `Output ripple ${(rippleOut * 1000).toFixed(1)} mVpp misses the ${(rippleTargetVolts(spec) * 1000).toFixed(1)} mVpp target.`,
    });
  }
  if (model.kind === "tube-fwct") {
    warnings.push({
      level: "warn",
      message:
        "Tube rectifier secondary is RMS per anode (each side of a centre tap). These valves are HV parts — a 12 V / 1 A rail is outside their design space.",
    });
    warnings.push({
      level: "warn",
      message: `Efficiency omits heater power (${heaterOmitted_W.toFixed(1)} W for ${model.label}). Rule of thumb, not SPICE.`,
    });
  }
  for (const s of arch.stages) {
    if (s.type === "choke" && spec.iload > s.Imax_A) {
      warnings.push({
        level: "error",
        message: `Choke ${s.partId} is rated ${s.Imax_A} A; load is ${spec.iload} A.`,
      });
    }
    if (s.type === "resistor") {
      const p = spec.iload ** 2 * s.R_ohm;
      if (p > s.Pmax_W * 0.5) {
        warnings.push({
          level: "warn",
          message: `Series R dissipates ${p.toFixed(2)} W (part rated ${s.Pmax_W} W).`,
        });
      }
    }
    if (s.type === "cap") {
      const node = capNodeIndex(arch.stages, s.id);
      const peak = vNodeMax[node] ?? vFirstCapMax;
      const isFirst = arch.stages.find((x) => x.type === "cap")?.id === s.id;
      if (peak > s.Vdc_V) {
        warnings.push({
          level: "error",
          message: isFirst
            ? `First capacitor ${s.partId} is ${s.Vdc_V} V; first-node peak ${peak.toFixed(1)} V.`
            : `Cap ${s.partId} is ${s.Vdc_V} V; simulated peak ${peak.toFixed(1)} V.`,
        });
      }
    }
    if (s.type === "regulator" && spec.iload > findRegulator(s.partId).iMax_A) {
      warnings.push({
        level: "error",
        message: `Regulator ${s.partId} is rated ${findRegulator(s.partId).iMax_A} A.`,
      });
    }
  }

  const metrics: SimMetrics = {
    vdcAvg: vPreAvg,
    vdcMin: vPreMin,
    vdcMax: vPreMax,
    ripplePp: ripplePre,
    vPreRegAvg: vPreAvg,
    vPreRegMin: vPreMin,
    vPreRegMax: vPreMax,
    ripplePreRegPp: ripplePre,
    voutAvg: vOutAvg,
    voutMin: vOutMin,
    voutMax: vOutMax,
    rippleOutPp: rippleOut,
    headroomMin,
    dropout,
    inRegulation,
    pRegulator_W: pReg,
    pSeries_W: pSeries,
    pRectifier_W: pRect,
    pTotalLoss_W: pHeat,
    efficiency: pOut / (pOut + pHeat),
    transformerRs_ohm: rsX,
    vsecUsed: vsec,
    iSecRms: analytic.iSecRms,
    transformerVa: analytic.transformerVa,
    vFirstCapMax,
    iPeak: iPeakSeen,
    iPeakUnclamped,
    heaterOmitted_W,
    warnings,
  };

  return { metrics, waveform, analytic };
}
