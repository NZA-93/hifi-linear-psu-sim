import { RECTIFIER_TYPES, type RectifierType } from '../types'

interface RectifierSelectorProps {
  value: RectifierType
  onChange: (next: RectifierType) => void
}

export function RectifierSelector({ value, onChange }: RectifierSelectorProps) {
  return (
    <section className="panel" aria-labelledby="rectifier-heading">
      <header className="panel-header">
        <h2 id="rectifier-heading">Rectifier</h2>
        <p className="panel-kicker">UI only — no model yet</p>
      </header>
      <div className="segmented" role="radiogroup" aria-label="Rectifier type">
        {RECTIFIER_TYPES.map((type) => (
          <label key={type} className={value === type ? 'segment selected' : 'segment'}>
            <input
              type="radio"
              name="rectifier-type"
              value={type}
              checked={value === type}
              onChange={() => onChange(type)}
            />
            {type}
          </label>
        ))}
      </div>
    </section>
  )
}
