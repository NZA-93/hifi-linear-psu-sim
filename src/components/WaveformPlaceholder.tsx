/** Static EXAMPLE waveform. Not produced by a simulation. */
export function WaveformPlaceholder() {
  const width = 720
  const height = 160
  const pad = 28
  const mid = height / 2
  const amp = 42
  const points: string[] = []
  for (let x = pad; x <= width - pad; x += 2) {
    const t = (x - pad) / (width - pad * 2)
    const y = mid - Math.sin(t * Math.PI * 4) * amp
    points.push(`${x},${y.toFixed(1)}`)
  }

  return (
    <section className="panel panel-full" aria-labelledby="wave-heading">
      <header className="panel-header">
        <h2 id="wave-heading">Time-domain waveform</h2>
        <p className="panel-kicker">EXAMPLE — not a real simulation</p>
      </header>
      <div className="chart-frame">
        <svg
          className="chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Placeholder sine wave labeled as an example, not a simulation result"
        >
          <rect x="0" y="0" width={width} height={height} fill="transparent" />
          {[0.25, 0.5, 0.75].map((frac) => (
            <line
              key={frac}
              x1={pad}
              x2={width - pad}
              y1={pad + (height - pad * 2) * frac}
              y2={pad + (height - pad * 2) * frac}
              className="chart-grid"
            />
          ))}
          <line x1={pad} y1={pad} x2={pad} y2={height - pad} className="chart-axis" />
          <line
            x1={pad}
            y1={height - pad}
            x2={width - pad}
            y2={height - pad}
            className="chart-axis"
          />
          <text x={8} y={18} className="chart-label">
            V
          </text>
          <text x={width - 22} y={height - 8} className="chart-label">
            t
          </text>
          <polyline points={points.join(' ')} className="chart-wave" />
          <text x={width / 2} y={24} textAnchor="middle" className="chart-watermark">
            EXAMPLE — not a real simulation
          </text>
        </svg>
      </div>
    </section>
  )
}
