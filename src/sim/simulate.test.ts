import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseComponentLibrary } from '../library'
import type { Circuit, Specs } from '../types'
import { simulate } from './simulate'

const sampleCircuit: Circuit = {
  rectifierType: 'diode',
  stages: [
    {
      id: 'xfmr',
      kind: 'transformer',
      label: 'Transformer',
      removable: false,
    },
    {
      id: 'rect',
      kind: 'rectifier',
      label: 'Diode rectifier',
      removable: false,
    },
  ],
}

const sampleSpecs: Specs = {
  voutV: 24,
  iloadA: 0.5,
  rippleTargetMVpp: 10,
}

describe('simulate (stub API)', () => {
  it('returns pending-model metrics with no numeric results', () => {
    const result = simulate(sampleCircuit, sampleSpecs)
    expect(result.status).toBe('pending_model')
    expect(result.rippleMVpp).toBeNull()
    expect(result.regulationPct).toBeNull()
    expect(result.dropoutHeadroomV).toBeNull()
    expect(result.comments.length).toBeGreaterThan(0)
    expect(result.comments.some((line) => /STUB/i.test(line))).toBe(true)
  })

  it('echoes rectifier type and spec values in comments (no invented physics)', () => {
    const result = simulate(
      { ...sampleCircuit, rectifierType: 'tube' },
      { voutV: 12, iloadA: 1.25, rippleTargetMVpp: 5 },
    )
    const blob = result.comments.join('\n')
    expect(blob).toContain('tube')
    expect(blob).toContain('12')
    expect(blob).toContain('1.25')
    expect(blob).toContain('5')
    expect(blob).not.toMatch(/ripple\s*=\s*\d/i)
  })
})

describe('parseComponentLibrary', () => {
  it('accepts a minimal valid library', () => {
    const library = parseComponentLibrary({
      schemaVersion: 1,
      parts: [
        {
          id: 'r1',
          type: 'R',
          label: 'Placeholder R',
          params: { ohms: 'TBD' },
          notes: 'PLACEHOLDER',
        },
      ],
    })
    expect(library.parts).toHaveLength(1)
    expect(library.parts[0]?.id).toBe('r1')
  })

  it('rejects unknown component types', () => {
    expect(() =>
      parseComponentLibrary({
        schemaVersion: 1,
        parts: [{ id: 'x', type: 'mosfet', label: 'Nope', params: {} }],
      }),
    ).toThrow(/parts\[0\]/)
  })

  it('accepts the shipped public/components.json seed', () => {
    const raw: unknown = JSON.parse(
      readFileSync(resolve('public/components.json'), 'utf8'),
    )
    const library = parseComponentLibrary(raw)
    expect(library.schemaVersion).toBe(1)
    expect(library.parts.length).toBeGreaterThanOrEqual(6)
    const types = new Set(library.parts.map((part) => part.type))
    expect(types.has('transformer')).toBe(true)
    expect(types.has('diode')).toBe(true)
    expect(types.has('tube')).toBe(true)
    expect(types.has('ic_rect')).toBe(true)
    expect(types.has('regulator')).toBe(true)
  })
})
