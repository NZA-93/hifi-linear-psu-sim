import type { PresetFile, PresetRecord } from '../types'

interface PresetPickerProps {
  file: PresetFile | null
  selectedId: string | null
  onSelect: (preset: PresetRecord) => void
}

const DAC_IDS = ['dac_5v', 'dac_3v3', 'dac_analog_p15']

export function PresetPicker({ file, selectedId, onSelect }: PresetPickerProps) {
  const selected = file?.presets.find((preset) => preset.id === selectedId)

  return (
    <section className="panel panel-full" aria-labelledby="preset-heading">
      <header className="panel-header">
        <h2 id="preset-heading">Named presets</h2>
        <p className="panel-kicker">data only — not baked into sim math</p>
      </header>
      <div className="preset-row">
        <label className="field preset-select">
          <span className="field-label">Preset</span>
          <select
            value={selectedId ?? ''}
            onChange={(event) => {
              const preset = file?.presets.find((item) => item.id === event.target.value)
              if (preset && preset.enabled && !preset.comingSoon) onSelect(preset)
            }}
          >
            {file?.presets.map((preset) => (
              <option key={preset.id} value={preset.id} disabled={!preset.enabled || preset.comingSoon}>
                {preset.name}
                {preset.comingSoon || !preset.enabled ? ' — coming soon' : ''}
              </option>
            ))}
          </select>
        </label>
        {selected?.polarity === 'negative' ? (
          <span className="badge badge-neg">negative-rail twin · sim is still single-rail</span>
        ) : null}
      </div>
      {selected ? <p className="preset-desc">{selected.description}</p> : null}
      <div className="dac-pack">
        <span className="field-label">DAC pack</span>
        <div className="chip-row">
          {file?.presets
            .filter((preset) => DAC_IDS.includes(preset.id))
            .map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={selectedId === preset.id ? 'chip selected' : 'chip'}
                onClick={() => onSelect(preset)}
              >
                {preset.name}
              </button>
            ))}
        </div>
      </div>
    </section>
  )
}
