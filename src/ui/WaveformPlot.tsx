import { useMemo } from "react";
import type { Waveform } from "../types";

const COLORS = {
  rect: "#6e6456",
  first: "#7aa2c4",
  pre: "#e8a04a",
  out: "#8fbf88",
};

function pathFrom(xs: number[], ys: number[], x0: number, y0: number, xScale: number, yScale: number): string {
  if (xs.length === 0) return "";
  const step = Math.max(1, Math.floor(xs.length / 800));
  let d = "";
  for (let i = 0; i < xs.length; i += step) {
    const x = x0 + xs[i] * xScale;
    const y = y0 - ys[i] * yScale;
    d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

export function WaveformPlot({ waveform }: { waveform: Waveform }) {
  const layout = useMemo(() => {
    const w = 760;
    const h = 260;
    const padL = 44;
    const padR = 12;
    const padT = 16;
    const padB = 28;
    const tMax = waveform.t[waveform.t.length - 1] || 0.04;
    const yMax = Math.max(
      1,
      ...waveform.vRect,
      ...waveform.vFirstCap,
      ...waveform.vPreReg,
      ...waveform.vOut,
    );
    const xScale = (w - padL - padR) / tMax;
    const yScale = (h - padT - padB) / yMax;
    return { w, h, padL, padT, padB, tMax, yMax, xScale, yScale, y0: h - padB };
  }, [waveform]);

  const { w, h, padL, padT, tMax, yMax, xScale, yScale, y0 } = layout;

  return (
    <div className="panel">
      <h2>Time domain (last 2 cycles)</h2>
      <div className="plot-wrap">
        <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Rectifier and filter waveforms">
          <rect x="0" y="0" width={w} height={h} fill="#110f0c" />
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const y = y0 - f * yMax * yScale;
            return (
              <g key={f}>
                <line x1={padL} y1={y} x2={w - 12} y2={y} stroke="#3b342c" strokeWidth="1" />
                <text x={padL - 6} y={y + 3} textAnchor="end" fill="#6e6456" fontSize="10">
                  {(f * yMax).toFixed(0)}
                </text>
              </g>
            );
          })}
          <path
            d={pathFrom(waveform.t, waveform.vRect, padL, y0, xScale, yScale)}
            fill="none"
            stroke={COLORS.rect}
            strokeWidth="1"
          />
          <path
            d={pathFrom(waveform.t, waveform.vFirstCap, padL, y0, xScale, yScale)}
            fill="none"
            stroke={COLORS.first}
            strokeWidth="1.4"
          />
          <path
            d={pathFrom(waveform.t, waveform.vPreReg, padL, y0, xScale, yScale)}
            fill="none"
            stroke={COLORS.pre}
            strokeWidth="1.6"
          />
          <path
            d={pathFrom(waveform.t, waveform.vOut, padL, y0, xScale, yScale)}
            fill="none"
            stroke={COLORS.out}
            strokeWidth="1.8"
          />
          <text x={padL} y={h - 8} fill="#6e6456" fontSize="10">
            0
          </text>
          <text x={w - 14} y={h - 8} textAnchor="end" fill="#6e6456" fontSize="10">
            {tMax.toFixed(3)} s
          </text>
          <text x={padL} y={padT - 2} fill="#6e6456" fontSize="10">
            V
          </text>
        </svg>
        <div className="plot-legend">
          <span>
            <i className="swatch" style={{ background: COLORS.rect }} />
            Rectified Thevenin
          </span>
          <span>
            <i className="swatch" style={{ background: COLORS.first }} />
            First C
          </span>
          <span>
            <i className="swatch" style={{ background: COLORS.pre }} />
            Pre-regulator
          </span>
          <span>
            <i className="swatch" style={{ background: COLORS.out }} />
            Output
          </span>
        </div>
      </div>
    </div>
  );
}
