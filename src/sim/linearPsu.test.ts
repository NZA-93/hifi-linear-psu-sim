import { describe, expect, it } from 'vitest'
import {
  capacitorRippleVpp,
  clcRippleAttenuationStub,
  crcRippleAttenuation,
  draftToSimInput,
  fullWaveRippleHz,
  headroomV,
  peakAfterRectify,
  psrrLinearGain,
  regulatorDissipationW,
  regulatorResidualRippleVpp,
  simulateLinearPsu,
} from './linearPsu'
import type { LinearPsuInput } from '../types'

const defaultCrc: LinearPsuInput = {
  voutV: 15,
  iloadA: 0.1,
  rippleTargetMVpp: 1,
  vacRms: 18,
  fLineHz: 50,
  rSecOhm: 0,
  rectifierType: 'diode_bridge',
  filterTopology: 'CRC',
  regulatorKind: 'series_IC',
  enabled: {
    transformer: true,
    rectifier: true,
    filter: true,
    regulator: true,
  },
  diodeVf: 0.9,
  c1Farad: 4700e-6,
  c2Farad: 2200e-6,
  rOhm: 10,
  lHenry: 1,
  esrC1Ohm: 0,
  chokeDcrOhm: 20,
  vdropout: 3,
  psrrDb120Hz: 65,
}

describe('named approximation functions', () => {
  it('Vpeak ≈ Vac_rms * √2 − 2*Vf', () => {
    expect(peakAfterRectify(18, 0.9)).toBeCloseTo(18 * Math.SQRT2 - 1.8, 10)
  })

  it('full-wave f_ripple = 2 * f_line', () => {
    expect(fullWaveRippleHz(50)).toBe(100)
    expect(fullWaveRippleHz(60)).toBe(120)
  })

  it('ΔV ≈ Iload / (f_ripple * C)', () => {
    expect(capacitorRippleVpp(0.1, 100, 4700e-6)).toBeCloseTo(0.1 / (100 * 4700e-6), 10)
  })

  it('CRC |H| = 1 / sqrt(1 + (2π f R C2)^2)', () => {
    const f = 100
    const r = 10
    const c2 = 2200e-6
    const omegaRc = 2 * Math.PI * f * r * c2
    expect(crcRippleAttenuation(r, c2, f)).toBeCloseTo(1 / Math.sqrt(1 + omegaRc * omegaRc), 10)
  })

  it('PSRR linear gain is 10^(−dB/20)', () => {
    expect(psrrLinearGain(0)).toBe(1)
    expect(psrrLinearGain(40)).toBeCloseTo(0.01, 12)
    expect(psrrLinearGain(65)).toBeCloseTo(10 ** (-65 / 20), 12)
  })

  it('headroom = Vdc_min − Vout − Vdropout', () => {
    expect(headroomV(20, 15, 3)).toBe(2)
  })

  it('P_reg ≈ (Vin_avg − Vout) * Iload', () => {
    expect(regulatorDissipationW(20, 15, 0.1)).toBeCloseTo(0.5, 10)
  })

  it('labels CLC as a stub and stays ≤ 1', () => {
    const result = clcRippleAttenuationStub(1, 2200e-6, 20, 100)
    expect(result.stub).toBe(true)
    expect(result.gain).toBeGreaterThan(0)
    expect(result.gain).toBeLessThanOrEqual(1)
  })
})

describe('simulateLinearPsu default CRC + LM317-class', () => {
  it('returns finite approximations and passes the 1 mVpp target', () => {
    const metrics = simulateLinearPsu(defaultCrc)
    const vPeak = 18 * Math.SQRT2 - 1.8
    const dVc1 = 0.1 / (100 * 4700e-6)
    const h = crcRippleAttenuation(10, 2200e-6, 100)
    const beforeReg = dVc1 * h
    const atLoadMv = regulatorResidualRippleVpp(beforeReg, 65) * 1000

    expect(metrics.vPeakAfterRectify).toBeCloseTo(vPeak, 8)
    expect(metrics.reservoirRippleVpp).toBeCloseTo(dVc1, 8)
    expect(metrics.vRippleBeforeRegulatorVpp).toBeCloseTo(beforeReg, 8)
    expect(metrics.vRippleAtLoadMVpp).toBeCloseTo(atLoadMv, 8)
    expect(metrics.vRippleAtLoadMVpp).toBeLessThan(1)
    expect(metrics.ripplePass).toBe(true)
    expect(metrics.headroomV).not.toBeNull()
    expect(metrics.pRegW).not.toBeNull()
    expect(metrics.formulaNotes.some((line) => /APPROX: Vpeak/.test(line))).toBe(true)
  })

  it('C-only uses ΔV ≈ I/(f C1) and skips CRC attenuation', () => {
    const metrics = simulateLinearPsu({ ...defaultCrc, filterTopology: 'C-only' })
    const dVc1 = 0.1 / (100 * 4700e-6)
    expect(metrics.reservoirRippleVpp).toBeCloseTo(dVc1, 8)
    expect(metrics.vRippleBeforeRegulatorVpp).toBeCloseTo(dVc1, 8)
  })

  it('CLC comments mark the coarser stub', () => {
    const metrics = simulateLinearPsu({ ...defaultCrc, filterTopology: 'CLC' })
    expect(metrics.comments.some((line) => /CLC STUB/i.test(line))).toBe(true)
    expect(metrics.vRippleBeforeRegulatorVpp).not.toBeNull()
  })

  it('tube rectifier stays on diode-bridge math with a stub comment', () => {
    const tube = simulateLinearPsu({ ...defaultCrc, rectifierType: 'tube' })
    const diode = simulateLinearPsu(defaultCrc)
    expect(tube.vPeakAfterRectify).toBeCloseTo(diode.vPeakAfterRectify ?? 0, 10)
    expect(tube.comments.some((line) => /STUB: rectifier type "tube"/.test(line))).toBe(true)
  })

  it('regulator none leaves pre-reg ripple at the load', () => {
    const metrics = simulateLinearPsu({
      ...defaultCrc,
      regulatorKind: 'none',
      enabled: { ...defaultCrc.enabled, regulator: false },
    })
    expect(metrics.vRippleAtLoadMVpp).toBeCloseTo((metrics.vRippleBeforeRegulatorVpp ?? 0) * 1000, 8)
    expect(metrics.vdropout).toBe(0)
    expect(metrics.pRegW).toBe(0)
  })

  it('draftToSimInput converts µF to farads only', () => {
    const input = draftToSimInput({
      voutV: 15,
      iloadA: 0.1,
      rippleTargetMVpp: 1,
      vacRms: 18,
      fLineHz: 50,
      rSecOhm: 0,
      rectifierType: 'diode_bridge',
      filterTopology: 'CRC',
      regulatorKind: 'series_IC',
      enabled: defaultCrc.enabled,
      diodeVf: 0.9,
      c1uF: 4700,
      c2uF: 2200,
      rOhm: 10,
      lH: 1,
      esrC1Ohm: 0.05,
      chokeDcrOhm: 20,
      vdropout: 3,
      psrrDb: 65,
    })
    expect(input.c1Farad).toBeCloseTo(4700e-6, 12)
    expect(input.c2Farad).toBeCloseTo(2200e-6, 12)
  })
})
