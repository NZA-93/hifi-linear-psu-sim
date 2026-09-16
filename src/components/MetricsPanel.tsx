import type { SimMetrics, Specs } from '../types'

interface MetricsPanelProps {
  metrics: SimMetrics
  specs: Specs
}

function formatMetric(value: number | null, unit: string): string {
  if (value === null) return 'N/A'
  return `${value} ${unit}`
}

export function MetricsPanel({ metrics, specs }: MetricsPanelProps) {
  return (
    <section className="panel" aria-labelledby="metrics-heading">
      <header className="panel-header">
        <h2 id="metrics-heading">Metrics</h2>
        <p className="panel-kicker pending">pending model</p>
      </header>
      <dl className="metrics">
        <div>
          <dt>Ripple</dt>
          <dd>
            {formatMetric(metrics.rippleMVpp, 'mVpp')}
            <small>target {specs.rippleTargetMVpp} mVpp (input only)</small>
          </dd>
        </div>
        <div>
          <dt>Regulation</dt>
          <dd>
            {formatMetric(metrics.regulationPct, '%')}
            <small>load / line model not plugged in</small>
          </dd>
        </div>
        <div>
          <dt>Dropout headroom</dt>
          <dd>
            {formatMetric(metrics.dropoutHeadroomV, 'V')}
            <small>regulator model not plugged in</small>
          </dd>
        </div>
      </dl>
      <ul className="comment-list">
        {metrics.comments.map((comment) => (
          <li key={comment}>{comment}</li>
        ))}
      </ul>
    </section>
  )
}
