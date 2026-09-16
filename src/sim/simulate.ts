import type { Circuit, RectifierType, SimulateFn, Specs } from '../types'

/**
 * STUB simulation entry point.
 *
 * Circuit Designer owns analytic RLC, rectifier, and regulator models.
 * This function must not invent electrical formulas or numeric results
 * that look authoritative. It echoes inputs and returns pending metrics.
 */
export const simulate: SimulateFn = (circuit: Circuit, specs: Specs) => {
  const stageKinds = circuit.stages.map((stage) => stage.kind).join(' → ')
  return {
    rippleMVpp: null,
    regulationPct: null,
    dropoutHeadroomV: null,
    status: 'pending_model',
    comments: [
      'STUB: simulate() does not apply an electrical model.',
      `Received rectifier type: ${circuit.rectifierType}.`,
      `Received ${circuit.stages.length} stage(s): ${stageKinds || '(none)'}.`,
      `Received specs: Vout=${specs.voutV} V, Iload=${specs.iloadA} A, ripple target=${specs.rippleTargetMVpp} mVpp.`,
      'Replace this implementation with Circuit Designer models. Until then, UI metrics stay N/A.',
    ],
  }
}

export function rectifierPartId(type: RectifierType): string {
  switch (type) {
    case 'diode':
      return 'diode-placeholder'
    case 'tube':
      return 'tube-placeholder'
    case 'IC':
      return 'ic-rect-placeholder'
  }
}

export function rectifierStageLabel(type: RectifierType): string {
  switch (type) {
    case 'diode':
      return 'Diode rectifier'
    case 'tube':
      return 'Tube rectifier'
    case 'IC':
      return 'IC rectifier'
  }
}
