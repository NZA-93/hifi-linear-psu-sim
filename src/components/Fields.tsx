interface NumberFieldProps {
  label: string
  unit: string
  value: number
  step?: number
  min?: number
  onChange: (value: number) => void
}

export function NumberField({ label, unit, value, step = 0.1, min = 0, onChange }: NumberFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input-row">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="unit">{unit}</span>
      </span>
    </label>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  options: { id: string; label: string }[]
  onChange: (value: string) => void
}

export function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.length === 0 ? <option value="">(none)</option> : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

interface SegmentedProps<T extends string> {
  legend: string
  value: T
  options: readonly T[]
  labels?: Partial<Record<T, string>>
  onChange: (value: T) => void
}

export function Segmented<T extends string>({
  legend,
  value,
  options,
  labels,
  onChange,
}: SegmentedProps<T>) {
  return (
    <fieldset className="segment-fieldset">
      <legend className="field-label">{legend}</legend>
      <div className="segmented" role="radiogroup" aria-label={legend}>
        {options.map((option) => (
          <label key={option} className={value === option ? 'segment selected' : 'segment'}>
            <input
              type="radio"
              name={legend}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {labels?.[option] ?? option}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

interface EnableRowProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  kicker?: string
}

export function EnableRow({ label, checked, onChange, kicker }: EnableRowProps) {
  return (
    <label className="enable-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <strong>{label}</strong>
        {kicker ? <em>{kicker}</em> : null}
      </span>
    </label>
  )
}
