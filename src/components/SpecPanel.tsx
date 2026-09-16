import type { Specs } from '../types'

interface SpecPanelProps {
  specs: Specs
  onChange: (next: Specs) => void
}

export function SpecPanel({ specs, onChange }: SpecPanelProps) {
  return (
    <section className="panel" aria-labelledby="spec-heading">
      <header className="panel-header">
        <h2 id="spec-heading">Targets</h2>
        <p className="panel-kicker">Example placeholders — not a design</p>
      </header>
      <div className="field-stack">
        <label className="field">
          <span className="field-label">Vout</span>
          <span className="field-input-row">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={specs.voutV}
              onChange={(event) =>
                onChange({ ...specs, voutV: Number(event.target.value) })
              }
            />
            <span className="unit">V</span>
          </span>
        </label>
        <label className="field">
          <span className="field-label">Iload</span>
          <span className="field-input-row">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={specs.iloadA}
              onChange={(event) =>
                onChange({ ...specs, iloadA: Number(event.target.value) })
              }
            />
            <span className="unit">A</span>
          </span>
        </label>
        <label className="field">
          <span className="field-label">Ripple target</span>
          <span className="field-input-row">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={specs.rippleTargetMVpp}
              onChange={(event) =>
                onChange({ ...specs, rippleTargetMVpp: Number(event.target.value) })
              }
            />
            <span className="unit">mVpp</span>
          </span>
        </label>
      </div>
    </section>
  )
}
