import type { LinearPsuMetrics } from '../types'

interface MetricsPanelProps {
  metrics: LinearPsuMetrics
  rippleTargetMVpp: number
}

function fmt(value: number | null, digits = 3, unit = ''): string {
  if (value === null || !Number.isFinite(value)) return 'n/a'
  const abs = Math.abs(value)
  const shown = abs >= 100 ? value.toFixed(1) : abs >= 1 ? value.toFixed(Math.min(digits, 3)) : value.toFixed(digits)
  return unit ? `${shown} ${unit}` : shown
}

function passLabel(value: boolean | null): string {
  if (value === null) return 'n/a'
  return value ? 'PASS' : 'FAIL'
}

export function MetricsPanel({ metrics, rippleTargetMVpp }: MetricsPanelProps) {
  return (
    <section className="panel" aria-labelledby="metrics-heading">
      <header className="panel-header">
        <h2 id="metrics-heading">Metrics</h2>
        <p className={metrics.overallPass ? 'panel-kicker pass' : 'panel-kicker fail'}>
          {metrics.overallPass === null ? 'approx' : passLabel(metrics.overallPass)} vs {rippleTargetMVpp} mVpp
        </p>
      </header>
      <p className="approx-note">Closed-form approximations — not SPICE. Circuit Designer owns future formula changes.</p>
      <dl className="metrics">
        <div>
          <dt>Vpeak after rectify</dt>
          <dd>
            {fmt(metrics.vPeakAfterRectify, 3, 'V')}
            <small>Vac·√2 − 2·Vf</small>
          </dd>
        </div>
        <div>
          <dt>Reservoir ΔV (C1)</dt>
          <dd>
            {fmt(metrics.reservoirRippleVpp, 4, 'V')}
            <small>Iload / (f_ripple · C1)</small>
          </dd>
        </div>
        <div>
          <dt>Vripple before regulator</dt>
          <dd>
            {fmt(metrics.vRippleBeforeRegulatorVpp === null ? null : metrics.vRippleBeforeRegulatorVpp * 1000, 3, 'mVpp')}
            <small>CRC/CLC/C-only estimate</small>
          </dd>
        </div>
        <div>
          <dt>Ripple at load</dt>
          <dd>
            {fmt(metrics.vRippleAtLoadMVpp, 4, 'mVpp')}
            <small>
              {passLabel(metrics.ripplePass)} · target {rippleTargetMVpp} mVpp · PSRR applied if regulator on
            </small>
          </dd>
        </div>
        <div>
          <dt>Vdropout</dt>
          <dd>{fmt(metrics.vdropout, 2, 'V')}</dd>
        </div>
        <div>
          <dt>Headroom</dt>
          <dd>
            {fmt(metrics.headroomV, 3, 'V')}
            <small>
              {passLabel(metrics.headroomPass)} · Vdc_min − Vout − Vdropout (Vdc_min {fmt(metrics.vdcMin, 2, 'V')})
            </small>
          </dd>
        </div>
        <div>
          <dt>P_reg</dt>
          <dd>
            {fmt(metrics.pRegW, 3, 'W')}
            <small>
              (Vin_avg − Vout)·Iload
              {metrics.thermalPlaceholder ? ' · THERMAL PLACEHOLDER (>1 W, no θJA model)' : ''}
            </small>
          </dd>
        </div>
        <div>
          <dt>Line / load regulation</dt>
          <dd>
            {fmt(metrics.lineRegulationPct, 3, '%')} / {fmt(metrics.loadRegulationPct, 3, '%')}
            <small>estimated % — see formula notes</small>
          </dd>
        </div>
      </dl>

      <h3 className="subhead">Suggested ranges</h3>
      <ul className="suggest-list">
        <li>
          C1 {fmt(metrics.suggestions.c1uF.min, 0)}–{fmt(metrics.suggestions.c1uF.max, 0)} µF
          <span>{metrics.suggestions.c1uF.note}</span>
        </li>
        <li>
          C2 typical {fmt(metrics.suggestions.c2uF.typical, 0)} µF
          <span>{metrics.suggestions.c2uF.note}</span>
        </li>
        <li>
          R {fmt(metrics.suggestions.rOhm.min, 2)}–{fmt(metrics.suggestions.rOhm.max, 2)} Ω
          <span>{metrics.suggestions.rOhm.note}</span>
        </li>
        <li>
          L {fmt(metrics.suggestions.lH.min, 2)}–{fmt(metrics.suggestions.lH.max, 2)} H
          <span>{metrics.suggestions.lH.note}</span>
        </li>
      </ul>

      <ul className="comment-list">
        {metrics.comments.map((comment) => (
          <li key={comment}>{comment}</li>
        ))}
      </ul>
      <details className="formula-details">
        <summary>Formula notes (reviewable)</summary>
        <ul>
          {metrics.formulaNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </details>
    </section>
  )
}
