import { FILTER_TOPOLOGIES, RECTIFIER_TYPES, type PresetFile, type PresetRecord } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function parsePresetFile(data: unknown): PresetFile {
  if (!isRecord(data)) throw new Error('Preset file must be a JSON object.')
  if (data.version !== 1) throw new Error('Preset file version must be 1.')
  if (typeof data.defaultPresetId !== 'string') {
    throw new Error('Preset file missing defaultPresetId.')
  }
  if (!Array.isArray(data.presets)) throw new Error('Preset file missing presets array.')

  const presets = data.presets.map((entry, index) => parsePreset(entry, index))
  const ids = new Set<string>()
  for (const preset of presets) {
    if (ids.has(preset.id)) throw new Error(`Duplicate preset id "${preset.id}".`)
    ids.add(preset.id)
  }
  if (!ids.has(data.defaultPresetId)) {
    throw new Error(`defaultPresetId "${data.defaultPresetId}" is not in presets.`)
  }
  return { version: 1, defaultPresetId: data.defaultPresetId, presets }
}

function parsePreset(entry: unknown, index: number): PresetRecord {
  if (!isRecord(entry)) throw new Error(`presets[${index}] must be an object.`)
  const filter = entry.filter
  const rectifier = entry.rectifier
  if (typeof filter !== 'string' || !FILTER_TOPOLOGIES.includes(filter as PresetRecord['filter'])) {
    throw new Error(`presets[${index}].filter is invalid.`)
  }
  if (
    typeof rectifier !== 'string' ||
    !RECTIFIER_TYPES.includes(rectifier as PresetRecord['rectifier'])
  ) {
    throw new Error(`presets[${index}].rectifier is invalid.`)
  }
  const polarity = entry.polarity
  if (polarity !== 'positive' && polarity !== 'negative') {
    throw new Error(`presets[${index}].polarity must be positive or negative.`)
  }
  const regulatorRaw = entry.regulator
  let regulator: string | null
  if (regulatorRaw === null) {
    regulator = null
  } else if (typeof regulatorRaw === 'string') {
    regulator = regulatorRaw
  } else {
    throw new Error(`presets[${index}].regulator must be a string id or null.`)
  }
  return {
    id: reqString(entry, 'id', index),
    name: reqString(entry, 'name', index),
    description: reqString(entry, 'description', index),
    enabled: reqBool(entry, 'enabled', index),
    polarity,
    vout: reqNumber(entry, 'vout', index),
    iload: reqNumber(entry, 'iload', index),
    ripple_target_mVpp: reqNumber(entry, 'ripple_target_mVpp', index),
    vac_rms: reqNumber(entry, 'vac_rms', index),
    f: reqNumber(entry, 'f', index),
    r_sec_ohm: optNumber(entry, 'r_sec_ohm'),
    filter: filter as PresetRecord['filter'],
    rectifier: rectifier as PresetRecord['rectifier'],
    regulator,
    c1_uF: reqNumber(entry, 'c1_uF', index),
    r_ohm: reqNumber(entry, 'r_ohm', index),
    c2_uF: reqNumber(entry, 'c2_uF', index),
    l_H: optNumber(entry, 'l_H'),
    comingSoon: entry.comingSoon === true,
  }
}

function reqString(row: Record<string, unknown>, key: string, index: number): string {
  const value = row[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`presets[${index}].${key} must be a non-empty string.`)
  }
  return value
}

function reqNumber(row: Record<string, unknown>, key: string, index: number): number {
  const value = row[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`presets[${index}].${key} must be a finite number.`)
  }
  return value
}

function optNumber(row: Record<string, unknown>, key: string): number | undefined {
  const value = row[key]
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${key} must be a finite number if present.`)
  }
  return value
}

function reqBool(row: Record<string, unknown>, key: string, index: number): boolean {
  const value = row[key]
  if (typeof value !== 'boolean') {
    throw new Error(`presets[${index}].${key} must be a boolean.`)
  }
  return value
}
