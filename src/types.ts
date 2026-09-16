/** Shared domain types for the UI shell and the stub simulation API. */

export const COMPONENT_TYPES = [
  'R',
  'L',
  'C',
  'diode',
  'tube',
  'ic_rect',
  'regulator',
  'transformer',
] as const

export type ComponentType = (typeof COMPONENT_TYPES)[number]

export type ParamValue = string | number | boolean

export interface LibraryPart {
  id: string
  type: ComponentType
  label: string
  params: Record<string, ParamValue>
  notes?: string
}

export interface ComponentLibrary {
  schemaVersion: number
  parts: LibraryPart[]
}

export const RECTIFIER_TYPES = ['diode', 'tube', 'IC'] as const
export type RectifierType = (typeof RECTIFIER_TYPES)[number]

export const STAGE_KINDS = [
  'transformer',
  'rectifier',
  'cap_filter',
  'rlc_filter',
  'regulator',
] as const
export type StageKind = (typeof STAGE_KINDS)[number]

export interface CircuitStage {
  id: string
  kind: StageKind
  label: string
  /** Optional reference into `public/components.json`. */
  partId?: string
  removable: boolean
}

export interface Circuit {
  rectifierType: RectifierType
  stages: CircuitStage[]
}

/** User-entered targets. Units are documented on each field. */
export interface Specs {
  /** Desired DC output, volts. */
  voutV: number
  /** Load current, amperes. */
  iloadA: number
  /** Ripple target, millivolts peak-to-peak. */
  rippleTargetMVpp: number
}

export type MetricStatus = 'pending_model'

/**
 * Stub metrics. Numeric fields are `null` until Circuit Designer
 * provides analytic models. Do not populate these with invented physics.
 */
export interface SimMetrics {
  rippleMVpp: number | null
  regulationPct: number | null
  dropoutHeadroomV: number | null
  status: MetricStatus
  comments: string[]
}

export type SimulateFn = (circuit: Circuit, specs: Specs) => SimMetrics
