import type {
  CapacitorPart,
  ChokePart,
  ComponentLibrary,
  DiodePart,
  RegulatorPart,
  ResistorPart,
} from './types'
import { REGULATOR_PART_TYPES } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function reqString(row: Record<string, unknown>, key: string, path: string): string {
  const value = row[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${path}.${key} must be a non-empty string.`)
  }
  return value
}

function reqNumber(row: Record<string, unknown>, key: string, path: string): number {
  const value = row[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path}.${key} must be a finite number.`)
  }
  return value
}

function optString(row: Record<string, unknown>, key: string): string | undefined {
  const value = row[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new Error(`${key} must be a string if present.`)
  return value
}

function parseList<T>(data: unknown, key: string, map: (row: Record<string, unknown>, path: string) => T): T[] {
  if (!isRecord(data)) throw new Error('Component library must be a JSON object.')
  const list = data[key]
  if (!Array.isArray(list)) throw new Error(`Component library missing ${key} array.`)
  const seen = new Set<string>()
  return list.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`${key}[${index}] must be an object.`)
    const parsed = map(entry, `${key}[${index}]`)
    const id = (parsed as { id: string }).id
    if (seen.has(id)) throw new Error(`Duplicate id "${id}" in ${key}.`)
    seen.add(id)
    return parsed
  })
}

function parseDiode(row: Record<string, unknown>, path: string): DiodePart {
  return {
    id: reqString(row, 'id', path),
    name: reqString(row, 'name', path),
    Vf: reqNumber(row, 'Vf', path),
    If_max: reqNumber(row, 'If_max', path),
    Vrrrm: reqNumber(row, 'Vrrrm', path),
    notes: optString(row, 'notes'),
  }
}

function parseCap(row: Record<string, unknown>, path: string): CapacitorPart {
  return {
    id: reqString(row, 'id', path),
    name: reqString(row, 'name', path),
    C_uF: reqNumber(row, 'C_uF', path),
    V_rated: reqNumber(row, 'V_rated', path),
    ESR_ohm: reqNumber(row, 'ESR_ohm', path),
    type: reqString(row, 'type', path),
    notes: optString(row, 'notes'),
  }
}

function parseResistor(row: Record<string, unknown>, path: string): ResistorPart {
  return {
    id: reqString(row, 'id', path),
    name: reqString(row, 'name', path),
    R_ohm: reqNumber(row, 'R_ohm', path),
    P_max_W: reqNumber(row, 'P_max_W', path),
    notes: optString(row, 'notes'),
  }
}

function parseChoke(row: Record<string, unknown>, path: string): ChokePart {
  return {
    id: reqString(row, 'id', path),
    name: reqString(row, 'name', path),
    L_H: reqNumber(row, 'L_H', path),
    I_sat_mA: reqNumber(row, 'I_sat_mA', path),
    DCR_ohm: reqNumber(row, 'DCR_ohm', path),
    notes: optString(row, 'notes'),
  }
}

function parseRegulator(row: Record<string, unknown>, path: string): RegulatorPart {
  const type = reqString(row, 'type', path)
  if (!REGULATOR_PART_TYPES.includes(type as RegulatorPart['type'])) {
    throw new Error(`${path}.type must be series_IC or series_discrete.`)
  }
  const vrefRaw = row.Vref
  let vref: number | null
  if (vrefRaw === null) {
    vref = null
  } else if (typeof vrefRaw === 'number' && Number.isFinite(vrefRaw)) {
    vref = vrefRaw
  } else {
    throw new Error(`${path}.Vref must be a number or null.`)
  }
  return {
    id: reqString(row, 'id', path),
    name: reqString(row, 'name', path),
    type: type as RegulatorPart['type'],
    Vdropout: reqNumber(row, 'Vdropout', path),
    I_max_A: reqNumber(row, 'I_max_A', path),
    PSRR_dB_120Hz: reqNumber(row, 'PSRR_dB_120Hz', path),
    Vref: vref,
    notes: optString(row, 'notes'),
  }
}

export function parseComponentLibrary(data: unknown): ComponentLibrary {
  if (!isRecord(data)) throw new Error('Component library must be a JSON object.')
  if (data.version !== 1) throw new Error('Component library version must be 1.')
  return {
    version: 1,
    diodes: parseList(data, 'diodes', parseDiode),
    capacitors: parseList(data, 'capacitors', parseCap),
    resistors: parseList(data, 'resistors', parseResistor),
    chokes: parseList(data, 'chokes', parseChoke),
    regulators: parseList(data, 'regulators', parseRegulator),
  }
}

export function findById<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((item) => item.id === id)
}
