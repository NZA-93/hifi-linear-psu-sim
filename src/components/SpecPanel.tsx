import { NumberField } from './Fields'
import type { PsuDraft } from '../types'

interface SpecPanelProps {
  draft: PsuDraft
  onChange: (patch: Partial<PsuDraft>) => void
}

export function SpecPanel({ draft, onChange }: SpecPanelProps) {
  return (
    <section className="panel" aria-labelledby="spec-heading">
      <header className="panel-header">
        <h2 id="spec-heading">Targets & source</h2>
        <p className="panel-kicker">single + rail</p>
      </header>
      <div className="field-stack">
        <NumberField label="Vout" unit="V" value={draft.voutV} step={0.1} onChange={(voutV) => onChange({ voutV })} />
        <NumberField
          label="Iload"
          unit="A"
          value={draft.iloadA}
          step={0.01}
          onChange={(iloadA) => onChange({ iloadA })}
        />
        <NumberField
          label="Ripple target"
          unit="mVpp"
          value={draft.rippleTargetMVpp}
          step={0.1}
          onChange={(rippleTargetMVpp) => onChange({ rippleTargetMVpp })}
        />
        <NumberField
          label="Vac_rms (secondary)"
          unit="V"
          value={draft.vacRms}
          step={0.1}
          onChange={(vacRms) => onChange({ vacRms })}
        />
        <NumberField
          label="f_line"
          unit="Hz"
          value={draft.fLineHz}
          step={10}
          onChange={(fLineHz) => onChange({ fLineHz })}
        />
        <NumberField
          label="Rsec (optional)"
          unit="Ω"
          value={draft.rSecOhm}
          step={0.1}
          onChange={(rSecOhm) => onChange({ rSecOhm })}
        />
      </div>
    </section>
  )
}
