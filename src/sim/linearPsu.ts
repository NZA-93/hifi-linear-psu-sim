import type {
  FilterSuggestions,
  LinearPsuInput,
  LinearPsuMetrics,
  RangeSuggestion,
} from '../types'

/**
 * Closed-form approximations for a single-rail linear PSU.
 *
 * Source: Circuit Designer brief (authoritative). Future formula changes
 * belong in this module — the UI must only call these functions.
 *
 * These are first-order estimates, not SPICE. Every exported helper is
 * named so the math can be reviewed in isolation.
 */

/** Vpeak after full-wave bridge ≈ Vac_rms * √2 − 2*Vf */
export function peakAfterRectify(vacRms: number, vf: number): number {
  return vacRms * Math.SQRT2 - 2 * vf
}

/** Full-wave bridge: f_ripple = 2 * f_line */
export function fullWaveRippleHz(fLineHz: number): number {
  return 2 * fLineHz
}

/**
 * Reservoir (C-only / CRC first-order) ripple:
 * ΔV ≈ Iload / (f_ripple * C)
 */
export function capacitorRippleVpp(iloadA: number, fRippleHz: number, cFarad: number): number {
  if (cFarad <= 0 || fRippleHz <= 0) return Number.POSITIVE_INFINITY
  return iloadA / (fRippleHz * cFarad)
}

/** Extra ΔV term from reservoir ESR: Iload * ESR (first-order, labeled approx). */
export function esrRippleVpp(iloadA: number, esrOhm: number): number {
  return Math.max(0, iloadA) * Math.max(0, esrOhm)
}

/**
 * First-order CRC: treat post-C1 ripple as a sine at f_ripple into R–C2.
 * |H| = 1 / sqrt(1 + (2π f_ripple R C2)^2)
 */
export function crcRippleAttenuation(rOhm: number, c2Farad: number, fRippleHz: number): number {
  if (rOhm <= 0 || c2Farad <= 0 || fRippleHz <= 0) return 1
  const omegaRc = 2 * Math.PI * fRippleHz * rOhm * c2Farad
  return 1 / Math.sqrt(1 + omegaRc * omegaRc)
}

/**
 * COARSER STUB for CLC: not a choke-input rectifier model.
 * Treats post-C1 ripple as a sine into series L (with DCR) and shunt C2.
 * |H| = 1 / sqrt((1 − ω² L C2)² + (ω C2 DCR)²)
 */
export function clcRippleAttenuationStub(
  lHenry: number,
  c2Farad: number,
  dcrOhm: number,
  fRippleHz: number,
): { gain: number; stub: true } {
  if (lHenry <= 0 || c2Farad <= 0 || fRippleHz <= 0) {
    return { gain: 1, stub: true }
  }
  const omega = 2 * Math.PI * fRippleHz
  const lcTerm = 1 - omega * omega * lHenry * c2Farad
  const dcrTerm = omega * c2Farad * Math.max(0, dcrOhm)
  const mag = Math.sqrt(lcTerm * lcTerm + dcrTerm * dcrTerm)
  return { gain: mag === 0 ? 1 : Math.min(1, 1 / mag), stub: true }
}

/** Voltage gain from PSRR in dB: 10^(−PSRR_dB / 20) */
export function psrrLinearGain(psrrDb: number): number {
  return 10 ** (-psrrDb / 20)
}

/** Residual ripple after a series regulator using PSRR_dB at 120 Hz. */
export function regulatorResidualRippleVpp(vinRippleVpp: number, psrrDb: number): number {
  return vinRippleVpp * psrrLinearGain(psrrDb)
}

/** Headroom: Vdc_min − Vout − Vdropout */
export function headroomV(vdcMin: number, voutV: number, vdropout: number): number {
  return vdcMin - voutV - vdropout
}

/** P_reg ≈ (Vin_avg − Vout) * Iload */
export function regulatorDissipationW(vinAvg: number, voutV: number, iloadA: number): number {
  return Math.max(0, vinAvg - voutV) * Math.max(0, iloadA)
}

/**
 * Line regulation approximation: ±10% Vac, rejected by PSRR (0 dB if no regulator).
 * line_regulation_% ≈ 100 * (0.10 * Vpeak * gain) / Vout
 */
export function lineRegulationPct(vPeak: number, voutV: number, psrrDb: number): number {
  if (voutV === 0) return Number.POSITIVE_INFINITY
  const dVout = 0.1 * vPeak * psrrLinearGain(psrrDb)
  return (100 * dVout) / Math.abs(voutV)
}

/**
 * Load regulation approximation: ΔV ≈ Iload * Rpath, optionally reduced by PSRR
 * as a coarse loop-rejection proxy (not a real load-reg model).
 */
export function loadRegulationPct(
  iloadA: number,
  rPathOhm: number,
  voutV: number,
  psrrDb: number,
): number {
  if (voutV === 0) return Number.POSITIVE_INFINITY
  const dV = Math.max(0, iloadA) * Math.max(0, rPathOhm) * psrrLinearGain(psrrDb)
  return (100 * dV) / Math.abs(voutV)
}

function range(min: number, max: number, typical: number, unit: string, note: string): RangeSuggestion {
  return { min, max, typical, unit, note }
}

/**
 * Suggested C1/C2/R/L ranges from the same first-order equations.
 * Not a design optimizer — bands for the user to compare against the library.
 */
export function suggestFilterRanges(input: {
  iloadA: number
  fRippleHz: number
  rippleTargetVpp: number
  psrrDb: number
  rOhm: number
  lHenry: number
  hasRegulator: boolean
}): FilterSuggestions {
  const { iloadA, fRippleHz, rippleTargetVpp, psrrDb, rOhm, lHenry, hasRegulator } = input
  const preRegTarget = hasRegulator
    ? rippleTargetVpp / Math.max(psrrLinearGain(psrrDb), 1e-9)
    : rippleTargetVpp

  const c1For = (dv: number) =>
    fRippleHz > 0 && dv > 0 ? (iloadA / (fRippleHz * dv)) * 1e6 : Number.POSITIVE_INFINITY

  const c1Min = c1For(2)
  const c1Typ = c1For(1)
  const c1Max = c1For(0.5)

  const hWanted = Math.min(0.5, preRegTarget / 1)
  const omega = 2 * Math.PI * Math.max(fRippleHz, 1e-9)
  const rcNeeded = hWanted > 0 && hWanted < 1 ? Math.sqrt(1 / (hWanted * hWanted) - 1) / omega : 0
  const rUse = rOhm > 0 ? rOhm : 10
  const c2FromR = rUse > 0 ? (rcNeeded / rUse) * 1e6 : 0
  const lUse = lHenry > 0 ? lHenry : 1
  const c2FromL = lUse > 0 ? (rcNeeded / lUse) * 1e6 : 0

  const rForDrop = (v: number) => (iloadA > 0 ? v / iloadA : 0)

  return {
    c1uF: range(
      c1Min,
      c1Max,
      c1Typ,
      'µF',
      'Approx C1 so reservoir ΔV is 0.5–2 V: C ≈ Iload / (f_ripple · ΔV).',
    ),
    c2uF: range(
      Math.min(c2FromR, c2FromL) || 470,
      Math.max(c2FromR, c2FromL, 4700),
      c2FromR || 2200,
      'µF',
      'CRC: C2 from first-order RC at f_ripple. CLC C2 is a coarser stub.',
    ),
    rOhm: range(
      rForDrop(0.2),
      rForDrop(1.5),
      rForDrop(0.5) || 10,
      'Ω',
      'CRC series R for ~0.2–1.5 V drop at Iload. Check dissipation I²R and headroom.',
    ),
    lH: range(0.1, 5, 1, 'H', 'CLC choke band is a placeholder range until Circuit Designer refines it.'),
  }
}

function dcPathOhm(input: LinearPsuInput): number {
  let r = Math.max(0, input.rSecOhm)
  if (!input.enabled.filter) return r
  if (input.filterTopology === 'CRC') r += Math.max(0, input.rOhm)
  if (input.filterTopology === 'CLC') r += Math.max(0, input.chokeDcrOhm)
  return r
}

function uF(farad: number): number {
  return farad * 1e6
}

/**
 * Top-level sim: inputs → metrics. UI must call this (or the named helpers
 * above) rather than re-deriving electrical math in React.
 */
export function simulateLinearPsu(input: LinearPsuInput): LinearPsuMetrics {
  const comments: string[] = []
  const formulaNotes: string[] = [
    'APPROX: Vpeak ≈ Vac_rms·√2 − 2·Vf (full-wave bridge).',
    'APPROX: ΔV_C ≈ Iload / (f_ripple · C) with f_ripple = 2·f_line.',
    'APPROX: CRC post-C1 ripple through R–C2: |H| = 1/√(1+(2π f R C2)²).',
    'CLC transfer is a coarser stub (LC divider), not a choke-input model.',
    'Regulator residual ripple uses PSRR_dB_120Hz from the library: ×10^(−dB/20).',
    'Headroom = Vdc_min − Vout − Vdropout. P_reg ≈ (Vin_avg − Vout)·Iload.',
    'Circuit Designer owns future formula changes; do not duplicate math in the UI.',
  ]

  const suggestions = suggestFilterRanges({
    iloadA: input.iloadA,
    fRippleHz: fullWaveRippleHz(input.fLineHz || 50),
    rippleTargetVpp: input.rippleTargetMVpp / 1000,
    psrrDb: input.regulatorKind === 'none' || !input.enabled.regulator ? 0 : input.psrrDb120Hz,
    rOhm: input.rOhm,
    lHenry: input.lHenry,
    hasRegulator: input.enabled.regulator && input.regulatorKind !== 'none',
  })

  const empty: LinearPsuMetrics = {
    vPeakAfterRectify: null,
    reservoirRippleVpp: null,
    vRippleBeforeRegulatorVpp: null,
    vRippleAtLoadMVpp: null,
    vdcMin: null,
    vinAvg: null,
    vdropout: null,
    headroomV: null,
    pRegW: null,
    lineRegulationPct: null,
    loadRegulationPct: null,
    thermalPlaceholder: false,
    ripplePass: null,
    headroomPass: null,
    overallPass: null,
    suggestions,
    comments,
    formulaNotes,
  }

  if (!input.enabled.transformer) {
    comments.push('Transformer stage disabled — no Vac secondary model is applied.')
    return empty
  }
  if (input.vacRms <= 0 || input.fLineHz <= 0 || input.iloadA < 0) {
    comments.push('Need Vac_rms > 0, f_line > 0, and Iload ≥ 0.')
    return empty
  }

  if (input.rectifierType !== 'diode_bridge') {
    comments.push(
      `STUB: rectifier type "${input.rectifierType}" is UI-only. Diode-bridge equations are used.`,
    )
  }

  const vf = input.enabled.rectifier ? input.diodeVf : 0
  if (!input.enabled.rectifier) {
    comments.push('Rectifier disabled — Vpeak uses Vac_rms·√2 with Vf = 0 (no bridge drop).')
  }

  const vPeak = peakAfterRectify(input.vacRms, vf)
  const rSecDrop = input.iloadA * Math.max(0, input.rSecOhm)
  const vPeakLoaded = vPeak - rSecDrop
  if (rSecDrop > 0) {
    comments.push(
      'APPROX: optional Rsec is modeled as a DC drop Iload·Rsec on Vpeak (not a pulsed-current model).',
    )
  }

  const fRipple = fullWaveRippleHz(input.fLineHz)
  let reservoirRipple = 0
  let vRippleBeforeReg = 0
  let seriesDrop = 0

  if (!input.enabled.filter) {
    comments.push('Filter disabled — no reservoir C; ripple estimate is not defined (treated as huge).')
    reservoirRipple = Number.POSITIVE_INFINITY
    vRippleBeforeReg = Number.POSITIVE_INFINITY
  } else if (input.c1Farad <= 0) {
    comments.push('C1 must be > 0 for a reservoir ripple estimate.')
    return { ...empty, vPeakAfterRectify: vPeakLoaded }
  } else {
    reservoirRipple =
      capacitorRippleVpp(input.iloadA, fRipple, input.c1Farad) +
      esrRippleVpp(input.iloadA, input.esrC1Ohm)
    if (input.esrC1Ohm > 0) {
      comments.push('APPROX: reservoir ΔV includes Iload·ESR_C1 in addition to I/(f C).')
    }
    if (input.filterTopology === 'C-only') {
      vRippleBeforeReg = reservoirRipple
      if (input.c2Farad > 0) {
        comments.push('C-only: C2 is unused in the ΔV ≈ I/(f C1) estimate (C1 is the reservoir).')
      }
    } else if (input.filterTopology === 'CRC') {
      const gain = crcRippleAttenuation(input.rOhm, input.c2Farad, fRipple)
      vRippleBeforeReg = reservoirRipple * gain
      seriesDrop = input.iloadA * Math.max(0, input.rOhm)
      comments.push(
        `CRC: ΔV_C1 ≈ ${reservoirRipple.toFixed(4)} V, |H_RC| ≈ ${gain.toFixed(4)} → Vripple before regulator.`,
      )
    } else {
      const { gain } = clcRippleAttenuationStub(input.lHenry, input.c2Farad, input.chokeDcrOhm, fRipple)
      vRippleBeforeReg = reservoirRipple * gain
      seriesDrop = input.iloadA * Math.max(0, input.chokeDcrOhm)
      comments.push(
        `CLC STUB: |H_LC| ≈ ${gain.toFixed(4)} (LC divider, not a choke-input rectifier).`,
      )
    }
  }

  const vdcMin =
    Number.isFinite(reservoirRipple) && Number.isFinite(vPeakLoaded)
      ? vPeakLoaded - reservoirRipple - seriesDrop
      : null
  const vinAvg =
    Number.isFinite(reservoirRipple) && Number.isFinite(vPeakLoaded)
      ? vPeakLoaded - reservoirRipple / 2 - seriesDrop
      : null

  const regOn = input.enabled.regulator && input.regulatorKind !== 'none'
  if (input.regulatorKind === 'series_discrete' && regOn) {
    comments.push('STUB: series_discrete uses a simple Vbe/dropout + PSRR number from the library part.')
  }

  const vdropout = regOn ? input.vdropout : 0
  const psrrDb = regOn ? input.psrrDb120Hz : 0
  const vRippleLoadVpp = regOn
    ? regulatorResidualRippleVpp(
        Number.isFinite(vRippleBeforeReg) ? vRippleBeforeReg : 0,
        psrrDb,
      )
    : vRippleBeforeReg
  const vRippleAtLoadMVpp = Number.isFinite(vRippleLoadVpp) ? vRippleLoadVpp * 1000 : null

  const headroom = vdcMin === null ? null : headroomV(vdcMin, input.voutV, vdropout)
  const pReg = vinAvg === null || !regOn ? (regOn ? null : 0) : regulatorDissipationW(vinAvg, input.voutV, input.iloadA)
  const thermalPlaceholder = (pReg ?? 0) > 1
  if (thermalPlaceholder) {
    comments.push(
      'THERMAL PLACEHOLDER: P_reg > 1 W. No heatsink/θJA model — flag only.',
    )
  }

  const linePct = lineRegulationPct(vPeakLoaded, input.voutV, psrrDb)
  const loadPct = loadRegulationPct(input.iloadA, dcPathOhm(input), input.voutV, psrrDb)

  const ripplePass =
    vRippleAtLoadMVpp === null ? null : vRippleAtLoadMVpp <= input.rippleTargetMVpp
  const headroomPass = headroom === null ? null : headroom >= 0
  const overallPass =
    ripplePass === null || headroomPass === null ? null : ripplePass && headroomPass

  comments.push(
    `Expected ripple at load ≈ ${vRippleAtLoadMVpp === null ? 'n/a' : vRippleAtLoadMVpp.toFixed(3)} mVpp vs target ${input.rippleTargetMVpp} mVpp.`,
  )
  comments.push(
    `Suggested C1 ≈ ${uF(input.c1Farad).toFixed(0)} µF used; typical band ${suggestions.c1uF.min.toFixed(0)}–${suggestions.c1uF.max.toFixed(0)} µF for 0.5–2 V reservoir ΔV.`,
  )

  return {
    vPeakAfterRectify: vPeakLoaded,
    reservoirRippleVpp: Number.isFinite(reservoirRipple) ? reservoirRipple : null,
    vRippleBeforeRegulatorVpp: Number.isFinite(vRippleBeforeReg) ? vRippleBeforeReg : null,
    vRippleAtLoadMVpp,
    vdcMin,
    vinAvg,
    vdropout: regOn ? vdropout : 0,
    headroomV: headroom,
    pRegW: pReg,
    lineRegulationPct: Number.isFinite(linePct) ? linePct : null,
    loadRegulationPct: Number.isFinite(loadPct) ? loadPct : null,
    thermalPlaceholder,
    ripplePass,
    headroomPass,
    overallPass,
    suggestions,
    comments,
    formulaNotes,
  }
}

export function draftToSimInput(draft: {
  voutV: number
  iloadA: number
  rippleTargetMVpp: number
  vacRms: number
  fLineHz: number
  rSecOhm: number
  rectifierType: LinearPsuInput['rectifierType']
  filterTopology: LinearPsuInput['filterTopology']
  regulatorKind: LinearPsuInput['regulatorKind']
  enabled: LinearPsuInput['enabled']
  diodeVf: number
  c1uF: number
  c2uF: number
  rOhm: number
  lH: number
  esrC1Ohm: number
  chokeDcrOhm: number
  vdropout: number
  psrrDb: number
}): LinearPsuInput {
  return {
    voutV: draft.voutV,
    iloadA: draft.iloadA,
    rippleTargetMVpp: draft.rippleTargetMVpp,
    vacRms: draft.vacRms,
    fLineHz: draft.fLineHz,
    rSecOhm: draft.rSecOhm,
    rectifierType: draft.rectifierType,
    filterTopology: draft.filterTopology,
    regulatorKind: draft.regulatorKind,
    enabled: draft.enabled,
    diodeVf: draft.diodeVf,
    c1Farad: draft.c1uF * 1e-6,
    c2Farad: draft.c2uF * 1e-6,
    rOhm: draft.rOhm,
    lHenry: draft.lH,
    esrC1Ohm: draft.esrC1Ohm,
    chokeDcrOhm: draft.chokeDcrOhm,
    vdropout: draft.vdropout,
    psrrDb120Hz: draft.psrrDb,
  }
}
