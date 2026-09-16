/** Domain types for the single-rail linear PSU dimensioner. */

export const FILTER_TOPOLOGIES = ['CRC', 'CLC', 'C-only'] as const
export type FilterTopology = (typeof FILTER_TOPOLOGIES)[number]

export const RECTIFIER_TYPES = ['diode_bridge', 'tube', 'active'] as const
export type RectifierType = (typeof RECTIFIER_TYPES)[number]

export const REGULATOR_KINDS = ['none', 'series_IC', 'series_discrete'] as const
export type RegulatorKind = (typeof REGULATOR_KINDS)[number]

export const REGULATOR_PART_TYPES = ['series_IC', 'series_discrete'] as const
export type RegulatorPartType = (typeof REGULATOR_PART_TYPES)[number]

export const POLARITIES = ['positive', 'negative'] as const
export type Polarity = (typeof POLARITIES)[number]

export interface DiodePart {
  id: string
  name: string
  Vf: number
  If_max: number
  Vrrrm: number
  notes?: string
}

export interface CapacitorPart {
  id: string
  name: string
  C_uF: number
  V_rated: number
  ESR_ohm: number
  type: string
  notes?: string
}

export interface ResistorPart {
  id: string
  name: string
  R_ohm: number
  P_max_W: number
  notes?: string
}

export interface ChokePart {
  id: string
  name: string
  L_H: number
  I_sat_mA: number
  DCR_ohm: number
  notes?: string
}

export interface RegulatorPart {
  id: string
  name: string
  type: RegulatorPartType
  Vdropout: number
  I_max_A: number
  PSRR_dB_120Hz: number
  /** Null for fixed regulators (e.g. 7805). */
  Vref: number | null
  notes?: string
}

/** `public/data/components.json` version 1. */
export interface ComponentLibrary {
  version: 1
  diodes: DiodePart[]
  capacitors: CapacitorPart[]
  resistors: ResistorPart[]
  chokes: ChokePart[]
  regulators: RegulatorPart[]
}

export interface StageEnables {
  transformer: boolean
  rectifier: boolean
  filter: boolean
  regulator: boolean
}

export interface PsuDraft {
  presetId: string | null
  voutV: number
  iloadA: number
  rippleTargetMVpp: number
  vacRms: number
  fLineHz: number
  rSecOhm: number
  rectifierType: RectifierType
  filterTopology: FilterTopology
  regulatorKind: RegulatorKind
  enabled: StageEnables
  diodeId: string
  cap1Id: string
  cap2Id: string
  resistorId: string
  chokeId: string
  regulatorId: string
  c1uF: number
  c2uF: number
  rOhm: number
  lH: number
  diodeVf: number
  esrC1Ohm: number
  chokeDcrOhm: number
  vdropout: number
  psrrDb: number
}

export interface PresetRecord {
  id: string
  name: string
  description: string
  enabled: boolean
  polarity: Polarity
  vout: number
  iload: number
  ripple_target_mVpp: number
  vac_rms: number
  f: number
  r_sec_ohm?: number
  filter: FilterTopology
  rectifier: RectifierType
  regulator: string | null
  c1_uF: number
  r_ohm: number
  c2_uF: number
  l_H?: number
  comingSoon?: boolean
}

export interface PresetFile {
  version: 1
  defaultPresetId: string
  presets: PresetRecord[]
}

/** Numeric input to the pure sim — no library IDs, no React state. */
export interface LinearPsuInput {
  voutV: number
  iloadA: number
  rippleTargetMVpp: number
  vacRms: number
  fLineHz: number
  rSecOhm: number
  rectifierType: RectifierType
  filterTopology: FilterTopology
  regulatorKind: RegulatorKind
  enabled: StageEnables
  diodeVf: number
  c1Farad: number
  c2Farad: number
  rOhm: number
  lHenry: number
  esrC1Ohm: number
  chokeDcrOhm: number
  vdropout: number
  psrrDb120Hz: number
}

export interface RangeSuggestion {
  min: number
  max: number
  typical: number
  unit: string
  note: string
}

export interface FilterSuggestions {
  c1uF: RangeSuggestion
  c2uF: RangeSuggestion
  rOhm: RangeSuggestion
  lH: RangeSuggestion
}

export interface LinearPsuMetrics {
  vPeakAfterRectify: number | null
  reservoirRippleVpp: number | null
  vRippleBeforeRegulatorVpp: number | null
  vRippleAtLoadMVpp: number | null
  vdcMin: number | null
  vinAvg: number | null
  vdropout: number | null
  headroomV: number | null
  pRegW: number | null
  lineRegulationPct: number | null
  loadRegulationPct: number | null
  thermalPlaceholder: boolean
  ripplePass: boolean | null
  headroomPass: boolean | null
  overallPass: boolean | null
  suggestions: FilterSuggestions
  comments: string[]
  formulaNotes: string[]
}
