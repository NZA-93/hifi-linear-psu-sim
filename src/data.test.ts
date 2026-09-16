import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { draftFromPreset } from './draft'
import { parseComponentLibrary } from './library'
import { parsePresetFile } from './presets'

function readJson(rel: string): unknown {
  return JSON.parse(readFileSync(resolve(rel), 'utf8'))
}

describe('shipped component library', () => {
  it('matches version-1 schema and seeds 1N4007 + LM317', () => {
    const library = parseComponentLibrary(readJson('public/data/components.json'))
    expect(library.version).toBe(1)
    const diode = library.diodes.find((part) => part.id === '1n4007')
    expect(diode).toMatchObject({ Vf: 0.9, If_max: 1.0, Vrrrm: 1000 })
    const lm317 = library.regulators.find((part) => part.id === 'lm317')
    expect(lm317).toMatchObject({
      type: 'series_IC',
      Vdropout: 3.0,
      I_max_A: 1.5,
      PSRR_dB_120Hz: 65,
      Vref: 1.25,
    })
    expect(library.capacitors.some((part) => part.C_uF === 4700 && part.V_rated === 35)).toBe(true)
    for (const choke of library.chokes) {
      expect(choke.notes?.includes('PLACEHOLDER') || !/^[A-Z0-9]{2,}-fake/i.test(choke.id)).toBe(true)
    }
  })
})

describe('shipped presets', () => {
  it('defaults to line_preamp_p15 and keeps coming-soon presets disabled', () => {
    const file = parsePresetFile(readJson('public/data/presets.json'))
    expect(file.defaultPresetId).toBe('line_preamp_p15')
    const p15 = file.presets.find((preset) => preset.id === 'line_preamp_p15')
    expect(p15).toMatchObject({
      vout: 15,
      iload: 0.1,
      ripple_target_mVpp: 1,
      vac_rms: 18,
      f: 50,
      filter: 'CRC',
      rectifier: 'diode_bridge',
      regulator: 'lm317',
      enabled: true,
    })
    const m15 = file.presets.find((preset) => preset.id === 'line_preamp_m15')
    expect(m15?.polarity).toBe('negative')
    expect(file.presets.find((preset) => preset.id === 'phono_p15')?.enabled).toBe(false)
    expect(file.presets.find((preset) => preset.id === 'power_amp_placeholder')?.enabled).toBe(false)
  })

  it('loads preset values into draft without changing sim math', () => {
    const library = parseComponentLibrary(readJson('public/data/components.json'))
    const file = parsePresetFile(readJson('public/data/presets.json'))
    const preset = file.presets.find((item) => item.id === 'line_preamp_p15')
    if (!preset) throw new Error('missing preset')
    const draft = draftFromPreset(preset, library)
    expect(draft.voutV).toBe(15)
    expect(draft.iloadA).toBe(0.1)
    expect(draft.filterTopology).toBe('CRC')
    expect(draft.regulatorId).toBe('lm317')
    expect(draft.c1uF).toBe(4700)
    expect(draft.rOhm).toBe(10)
    expect(draft.c2uF).toBe(2200)
    expect(draft.vdropout).toBe(3)
    expect(draft.psrrDb).toBe(65)
  })
})
