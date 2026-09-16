import type { SimResult, SpecInput } from "../types";
import { fmt, fmtMv } from "./format";
import { rippleTargetVolts } from "../sim/analytics";

export function ResultsPanel({ spec, result }: { spec: SpecInput; result: SimResult }) {
  const { metrics, analytic } = result;
  const target = rippleTargetVolts(spec);
  const rippleOk = metrics.rippleOutPp <= target * 1.15;
  const headTone = metrics.inRegulation ? "good" : "bad";

  return (
    <div className="panel">
      <h2>Simulation</h2>
      <div className="metrics">
        <div className="metric">
          <span className="k">Vsec used</span>
          <span className="v">{fmt(metrics.vsecUsed, 2, "Vrms")}</span>
        </div>
        <div className="metric">
          <span className="k">Raw Vdc (avg)</span>
          <span className="v">{fmt(metrics.vPreRegAvg, 2, "V")}</span>
        </div>
        <div className={`metric ${rippleOk ? "good" : "warn"}`}>
          <span className="k">Output ripple</span>
          <span className="v">{fmtMv(metrics.rippleOutPp)}pp</span>
        </div>
        <div className="metric">
          <span className="k">Vout avg</span>
          <span className="v">{fmt(metrics.voutAvg, 2, "V")}</span>
        </div>
        <div className={`metric ${headTone}`}>
          <span className="k">Headroom (valley)</span>
          <span className="v">{fmt(metrics.headroomMin, 2, "V")}</span>
        </div>
        <div className="metric">
          <span className="k">Regulator heat</span>
          <span className="v">{fmt(metrics.pRegulator_W, 2, "W")}</span>
        </div>
        <div className="metric">
          <span className="k">Total dissipation</span>
          <span className="v">{fmt(metrics.pTotalLoss_W, 2, "W")}</span>
        </div>
        <div className="metric">
          <span className="k">Efficiency (rough)</span>
          <span className="v">{fmt(metrics.efficiency * 100, 1, "%")}</span>
        </div>
      </div>
      <p className="fine">
        Analytic check: Vpeak {fmt(analytic.vPeak, 2, "V")}, rectifier drop{" "}
        {fmt(analytic.vfTotal, 2, "V")}, reservoir ripple {fmtMv(analytic.reservoirRipplePp)}pp,
        series IR {fmt(analytic.seriesDrop, 2, "V")}. Dropout modelled as{" "}
        {fmt(metrics.dropout, 2, "V")}. Raw valley {fmt(metrics.vPreRegMin, 2, "V")} / peak{" "}
        {fmt(metrics.vPreRegMax, 2, "V")}.
      </p>
      {metrics.warnings.length > 0 && (
        <div className="warnings">
          {metrics.warnings.map((w, i) => (
            <div key={i} className={`warn-item ${w.level}`}>
              {w.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
