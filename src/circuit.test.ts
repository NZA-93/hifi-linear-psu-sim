import { describe, expect, it } from 'vitest'
import { addRegulator, addRlcFilter, createStarterCircuit, removeStage, setRectifierType } from './circuit'

describe('circuit UI helpers', () => {
  it('starts with transformer and rectifier locked', () => {
    const circuit = createStarterCircuit()
    const locked = circuit.stages.filter((stage) => !stage.removable).map((stage) => stage.kind)
    expect(locked).toEqual(['transformer', 'rectifier'])
    expect(circuit.rectifierType).toBe('diode')
  })

  it('updates rectifier stage label when the type changes', () => {
    const circuit = setRectifierType(createStarterCircuit(), 'tube')
    expect(circuit.rectifierType).toBe('tube')
    const rectifier = circuit.stages.find((stage) => stage.kind === 'rectifier')
    expect(rectifier?.label).toMatch(/tube/i)
    expect(rectifier?.partId).toBe('tube-placeholder')
  })

  it('adds and removes RLC and regulator stages in UI state only', () => {
    let circuit = createStarterCircuit()
    const initialCount = circuit.stages.length
    circuit = addRlcFilter(circuit)
    circuit = addRegulator(circuit)
    expect(circuit.stages.length).toBe(initialCount + 2)
    const removableIds = circuit.stages.filter((stage) => stage.removable).map((stage) => stage.id)
    for (const id of removableIds) {
      circuit = removeStage(circuit, id)
    }
    expect(circuit.stages.every((stage) => !stage.removable)).toBe(true)
    expect(circuit.stages).toHaveLength(2)
  })
})
