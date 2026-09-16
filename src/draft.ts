import { findById } from './library'
import type { ComponentLibrary, PresetRecord, PsuDraft } from './types'

const DEFAULT_ENABLES = {
  transformer: true,
  rectifier: true,
  filter: true,
  regulator: true,
}

function closest<T>(list: T[], target: number, read: (item: T) => number): T | undefined {
  if (list.length === 0) return undefined
  return list.reduce((best, item) =>
    Math.abs(read(item) - target) < Math.abs(read(best) - target) ? item : best,
  )
}

/** Map a preset + library into UI draft fields. No electrical math. */
export function draftFromPreset(preset: PresetRecord, library: ComponentLibrary | null): PsuDraft {
  const diode = library?.diodes[0]
  const cap1 = library ? closest(library.capacitors, preset.c1_uF, (part) => part.C_uF) : undefined
  const cap2 = library ? closest(library.capacitors, preset.c2_uF, (part) => part.C_uF) : undefined
  const resistor = library ? closest(library.resistors, preset.r_ohm, (part) => part.R_ohm) : undefined
  const choke = library
    ? closest(library.chokes, preset.l_H ?? 1, (part) => part.L_H)
    : undefined
  const regulator = preset.regulator && library ? findById(library.regulators, preset.regulator) : undefined

  const regulatorKind = regulator
    ? regulator.type
    : preset.regulator
      ? 'series_IC'
      : 'none'

  return {
    presetId: preset.id,
    voutV: preset.vout,
    iloadA: preset.iload,
    rippleTargetMVpp: preset.ripple_target_mVpp,
    vacRms: preset.vac_rms,
    fLineHz: preset.f,
    rSecOhm: preset.r_sec_ohm ?? 0,
    rectifierType: preset.rectifier,
    filterTopology: preset.filter,
    regulatorKind,
    enabled: {
      ...DEFAULT_ENABLES,
      regulator: regulatorKind !== 'none',
    },
    diodeId: diode?.id ?? '1n4007',
    cap1Id: cap1?.id ?? '',
    cap2Id: cap2?.id ?? '',
    resistorId: resistor?.id ?? '',
    chokeId: choke?.id ?? '',
    regulatorId: regulator?.id ?? preset.regulator ?? '',
    c1uF: cap1?.C_uF ?? preset.c1_uF,
    c2uF: cap2?.C_uF ?? preset.c2_uF,
    rOhm: resistor?.R_ohm ?? preset.r_ohm,
    lH: choke?.L_H ?? preset.l_H ?? 1,
    diodeVf: diode?.Vf ?? 0.9,
    esrC1Ohm: cap1?.ESR_ohm ?? 0,
    chokeDcrOhm: choke?.DCR_ohm ?? 0,
    vdropout: regulator?.Vdropout ?? 3,
    psrrDb: regulator?.PSRR_dB_120Hz ?? 0,
  }
}

export function fallbackDraft(): PsuDraft {
  return {
    presetId: 'line_preamp_p15',
    voutV: 15,
    iloadA: 0.1,
    rippleTargetMVpp: 1,
    vacRms: 18,
    fLineHz: 50,
    rSecOhm: 0,
    rectifierType: 'diode_bridge',
    filterTopology: 'CRC',
    regulatorKind: 'series_IC',
    enabled: { ...DEFAULT_ENABLES },
    diodeId: '1n4007',
    cap1Id: 'cap-4700u-35v',
    cap2Id: 'cap-2200u-35v',
    resistorId: 'r-10-3w',
    chokeId: 'choke-placeholder-1h',
    regulatorId: 'lm317',
    c1uF: 4700,
    c2uF: 2200,
    rOhm: 10,
    lH: 1,
    diodeVf: 0.9,
    esrC1Ohm: 0.05,
    chokeDcrOhm: 20,
    vdropout: 3,
    psrrDb: 65,
  }
}
