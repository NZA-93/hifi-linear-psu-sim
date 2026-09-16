import type { Circuit, CircuitStage, RectifierType, Specs } from './types'
import { rectifierPartId, rectifierStageLabel } from './sim/simulate'

/** Example-placeholder defaults for the spec panel. Not recommended operating points. */
export const EXAMPLE_SPECS: Specs = {
  voutV: 24,
  iloadA: 0.5,
  rippleTargetMVpp: 10,
}

function stageId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function rectifierStage(type: RectifierType): CircuitStage {
  return {
    id: 'stg-rectifier',
    kind: 'rectifier',
    label: rectifierStageLabel(type),
    partId: rectifierPartId(type),
    removable: false,
  }
}

/** Starter topology shown in the UI. Stages are placeholders, not a designed PSU. */
export function createStarterCircuit(rectifierType: RectifierType = 'diode'): Circuit {
  return {
    rectifierType,
    stages: [
      {
        id: 'stg-transformer',
        kind: 'transformer',
        label: 'Transformer',
        partId: 'xfmr-placeholder',
        removable: false,
      },
      rectifierStage(rectifierType),
      {
        id: 'stg-cap',
        kind: 'cap_filter',
        label: 'Capacitor filter',
        partId: 'cap-placeholder',
        removable: true,
      },
      {
        id: 'stg-rc',
        kind: 'rlc_filter',
        label: 'RC filter',
        partId: 'r-placeholder',
        removable: true,
      },
      {
        id: 'stg-reg',
        kind: 'regulator',
        label: 'Linear regulator',
        partId: 'reg-placeholder',
        removable: true,
      },
    ],
  }
}

export function setRectifierType(circuit: Circuit, rectifierType: RectifierType): Circuit {
  return {
    rectifierType,
    stages: circuit.stages.map((stage) =>
      stage.kind === 'rectifier'
        ? { ...stage, label: rectifierStageLabel(rectifierType), partId: rectifierPartId(rectifierType) }
        : stage,
    ),
  }
}

export function addRlcFilter(circuit: Circuit): Circuit {
  const stage: CircuitStage = {
    id: stageId('rlc'),
    kind: 'rlc_filter',
    label: 'RLC filter',
    partId: 'l-placeholder',
    removable: true,
  }
  return insertBeforeRegulator(circuit, stage)
}

export function addRegulator(circuit: Circuit): Circuit {
  return {
    ...circuit,
    stages: [
      ...circuit.stages,
      {
        id: stageId('reg'),
        kind: 'regulator',
        label: 'Linear regulator',
        partId: 'reg-placeholder',
        removable: true,
      },
    ],
  }
}

export function removeStage(circuit: Circuit, stageIdToRemove: string): Circuit {
  return {
    ...circuit,
    stages: circuit.stages.filter((stage) => !(stage.removable && stage.id === stageIdToRemove)),
  }
}

function insertBeforeRegulator(circuit: Circuit, stage: CircuitStage): Circuit {
  const stages = [...circuit.stages]
  const lastRegIndex = stages.reduce(
    (found, item, index) => (item.kind === 'regulator' ? index : found),
    -1,
  )
  if (lastRegIndex === -1) {
    stages.push(stage)
  } else {
    stages.splice(lastRegIndex, 0, stage)
  }
  return { ...circuit, stages }
}
