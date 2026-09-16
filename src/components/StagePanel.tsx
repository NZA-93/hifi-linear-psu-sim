import { EnableRow, NumberField, Segmented, SelectField } from './Fields'
import { findById } from '../library'
import {
  FILTER_TOPOLOGIES,
  RECTIFIER_TYPES,
  REGULATOR_KINDS,
  type ComponentLibrary,
  type FilterTopology,
  type PsuDraft,
  type RectifierType,
  type RegulatorKind,
} from '../types'

interface StagePanelProps {
  draft: PsuDraft
  library: ComponentLibrary | null
  onChange: (patch: Partial<PsuDraft>) => void
}

export function StagePanel({ draft, library, onChange }: StagePanelProps) {
  const setEnabled = (key: keyof PsuDraft['enabled'], value: boolean) => {
    onChange({ enabled: { ...draft.enabled, [key]: value } })
  }

  return (
    <section className="panel panel-span" aria-labelledby="stages-heading">
      <header className="panel-header">
        <h2 id="stages-heading">Circuit stages</h2>
        <p className="panel-kicker">AC → bridge → C1 → CRC/CLC/C → regulator</p>
      </header>

      <div className="stage-card">
        <EnableRow
          label="1. Transformer secondary"
          kicker="ideal sine Vac_rms + f"
          checked={draft.enabled.transformer}
          onChange={(checked) => setEnabled('transformer', checked)}
        />
        <p className="stage-hint">Vac, f_line, and optional Rsec live in Targets & source.</p>
      </div>

      <div className="stage-card">
        <EnableRow
          label="2. Rectifier"
          kicker="full-wave bridge now; tube/active UI stub"
          checked={draft.enabled.rectifier}
          onChange={(checked) => setEnabled('rectifier', checked)}
        />
        <Segmented
          legend="Rectifier type"
          value={draft.rectifierType}
          options={RECTIFIER_TYPES}
          labels={{ diode_bridge: 'diode bridge', tube: 'tube (stub)', active: 'active (stub)' }}
          onChange={(rectifierType: RectifierType) => onChange({ rectifierType })}
        />
        <div className="field-grid">
          <SelectField
            label="Diode"
            value={draft.diodeId}
            options={(library?.diodes ?? []).map((part) => ({ id: part.id, label: part.name }))}
            onChange={(diodeId) => {
              const part = library ? findById(library.diodes, diodeId) : undefined
              onChange({ diodeId, diodeVf: part?.Vf ?? draft.diodeVf })
            }}
          />
          <NumberField
            label="Vf"
            unit="V"
            value={draft.diodeVf}
            step={0.05}
            onChange={(diodeVf) => onChange({ diodeVf })}
          />
        </div>
      </div>

      <div className="stage-card">
        <EnableRow
          label="3. Filter"
          kicker="CRC | CLC | C-only"
          checked={draft.enabled.filter}
          onChange={(checked) => setEnabled('filter', checked)}
        />
        <Segmented
          legend="Filter topology"
          value={draft.filterTopology}
          options={FILTER_TOPOLOGIES}
          onChange={(filterTopology: FilterTopology) => onChange({ filterTopology })}
        />
        <div className="field-grid">
          <SelectField
            label="C1"
            value={draft.cap1Id}
            options={(library?.capacitors ?? []).map((part) => ({ id: part.id, label: part.name }))}
            onChange={(cap1Id) => {
              const part = library ? findById(library.capacitors, cap1Id) : undefined
              onChange({
                cap1Id,
                c1uF: part?.C_uF ?? draft.c1uF,
                esrC1Ohm: part?.ESR_ohm ?? draft.esrC1Ohm,
              })
            }}
          />
          <NumberField label="C1" unit="µF" value={draft.c1uF} step={10} onChange={(c1uF) => onChange({ c1uF })} />
          <NumberField
            label="C1 ESR"
            unit="Ω"
            value={draft.esrC1Ohm}
            step={0.01}
            onChange={(esrC1Ohm) => onChange({ esrC1Ohm })}
          />
          {draft.filterTopology !== 'C-only' ? (
            <>
              <SelectField
                label="C2"
                value={draft.cap2Id}
                options={(library?.capacitors ?? []).map((part) => ({ id: part.id, label: part.name }))}
                onChange={(cap2Id) => {
                  const part = library ? findById(library.capacitors, cap2Id) : undefined
                  onChange({ cap2Id, c2uF: part?.C_uF ?? draft.c2uF })
                }}
              />
              <NumberField label="C2" unit="µF" value={draft.c2uF} step={10} onChange={(c2uF) => onChange({ c2uF })} />
            </>
          ) : null}
          {draft.filterTopology === 'CRC' ? (
            <>
              <SelectField
                label="R1"
                value={draft.resistorId}
                options={(library?.resistors ?? []).map((part) => ({ id: part.id, label: part.name }))}
                onChange={(resistorId) => {
                  const part = library ? findById(library.resistors, resistorId) : undefined
                  onChange({ resistorId, rOhm: part?.R_ohm ?? draft.rOhm })
                }}
              />
              <NumberField label="R" unit="Ω" value={draft.rOhm} step={0.1} onChange={(rOhm) => onChange({ rOhm })} />
            </>
          ) : null}
          {draft.filterTopology === 'CLC' ? (
            <>
              <SelectField
                label="L1"
                value={draft.chokeId}
                options={(library?.chokes ?? []).map((part) => ({ id: part.id, label: part.name }))}
                onChange={(chokeId) => {
                  const part = library ? findById(library.chokes, chokeId) : undefined
                  onChange({
                    chokeId,
                    lH: part?.L_H ?? draft.lH,
                    chokeDcrOhm: part?.DCR_ohm ?? draft.chokeDcrOhm,
                  })
                }}
              />
              <NumberField label="L" unit="H" value={draft.lH} step={0.1} onChange={(lH) => onChange({ lH })} />
              <NumberField
                label="DCR"
                unit="Ω"
                value={draft.chokeDcrOhm}
                step={0.1}
                onChange={(chokeDcrOhm) => onChange({ chokeDcrOhm })}
              />
            </>
          ) : null}
        </div>
      </div>

      <div className="stage-card">
        <EnableRow
          label="4. Regulator"
          kicker="none | series_IC | series_discrete"
          checked={draft.enabled.regulator}
          onChange={(checked) => {
            if (!checked) {
              onChange({
                regulatorKind: 'none',
                enabled: { ...draft.enabled, regulator: false },
              })
              return
            }
            const match = library?.regulators.find((part) => part.type === 'series_IC')
            onChange({
              regulatorKind: 'series_IC',
              regulatorId: match?.id ?? 'lm317',
              vdropout: match?.Vdropout ?? 3,
              psrrDb: match?.PSRR_dB_120Hz ?? 65,
              enabled: { ...draft.enabled, regulator: true },
            })
          }}
        />
        <Segmented
          legend="Regulator type"
          value={draft.regulatorKind}
          options={REGULATOR_KINDS}
          labels={{ none: 'none', series_IC: 'series IC', series_discrete: 'discrete (stub)' }}
          onChange={(regulatorKind: RegulatorKind) => {
            if (regulatorKind === 'none') {
              onChange({ regulatorKind, regulatorId: '', enabled: { ...draft.enabled, regulator: false } })
              return
            }
            const match = library?.regulators.find((part) => part.type === regulatorKind)
            onChange({
              regulatorKind,
              regulatorId: match?.id ?? draft.regulatorId,
              vdropout: match?.Vdropout ?? draft.vdropout,
              psrrDb: match?.PSRR_dB_120Hz ?? draft.psrrDb,
              enabled: { ...draft.enabled, regulator: true },
            })
          }}
        />
        {draft.regulatorKind !== 'none' ? (
          <div className="field-grid">
            <SelectField
              label="Regulator"
              value={draft.regulatorId}
              options={(library?.regulators ?? [])
                .filter((part) => part.type === draft.regulatorKind)
                .map((part) => ({ id: part.id, label: part.name }))}
              onChange={(regulatorId) => {
                const part = library ? findById(library.regulators, regulatorId) : undefined
                onChange({
                  regulatorId,
                  vdropout: part?.Vdropout ?? draft.vdropout,
                  psrrDb: part?.PSRR_dB_120Hz ?? draft.psrrDb,
                  regulatorKind: part?.type ?? draft.regulatorKind,
                })
              }}
            />
            <NumberField
              label="Vdropout"
              unit="V"
              value={draft.vdropout}
              step={0.1}
              onChange={(vdropout) => onChange({ vdropout })}
            />
            <NumberField
              label="PSRR @ 120 Hz"
              unit="dB"
              value={draft.psrrDb}
              step={1}
              onChange={(psrrDb) => onChange({ psrrDb })}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
