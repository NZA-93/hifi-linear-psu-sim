import type { Architecture, SimResult, SpecInput } from "../types";
import { fmt, fmtMv } from "./format";
import { findRectifier } from "../library";
import { rippleMeetsTarget, rippleVsTargetLabel } from "./rippleCopy";
import { DROPOUT_GLOSS, PEAK_CLAMP_GLOSS, isPeakClampWarning, secondaryVacGloss } from "./eeGloss";
import { GlossText } from "./GlossText";

export function ResultsPanel({
  spec,
  arch,
  result,
}: {
  spec: SpecInput;
  arch: Architecture;
  result: SimResult;
}) {
  const { metrics, analytic } = result;
  const rippleOk = rippleMeetsTarget(metrics.rippleOutPp, spec);
  const headTone = metrics.inRegulation ? "good" : "bad";
  const rectifier = findRectifier(arch.rectifierId);
  const tubeRectifier = rectifier.kind === "tube-fwct";
  const hasRegulator = arch.stages.some((s) => s.type === "regulator");
  const vsecTitle = secondaryVacGloss(rectifier.kind) ?? undefined;

  return (
    <div className="panel">
      <h2>Simulation</h2>
      <div className="metrics">
        <div className="metric" title={vsecTitle}>
          <span className="k">Vsec used</span>
          <span className="v">{fmt(metrics.vsecUsed, 2, "Vrms")}</span>
        </div>
        <div className="metric" title="Cap-input rule of thumb (~1.8× Idc), not SPICE">
          <span className="k">Isec (rms est.)</span>
          <span className="v">{fmt(metrics.iSecRms, 2, "A")}</span>
        </div>
        <div
          className="metric"
          title={
            tubeRectifier
              ? "2 × Vsec × Isec_rms (FW-CT half-windings). Rule of thumb, not SPICE."
              : "Vsec × Isec_rms. Rule of thumb, not SPICE."
          }
        >
          <span className="k">Transformer VA</span>
          <span className="v">{fmt(metrics.transformerVa, 0, "VA")}</span>
          {tubeRectifier && <span className="metric-note">2× half-winding</span>}
        </div>
        <div className="metric">
          <span className="k">Raw Vdc (avg)</span>
          <span className="v">{fmt(metrics.vPreRegAvg, 2, "V")}</span>
        </div>
        <div className={`metric ${rippleOk ? "good" : "warn"}`}>
          <span className="k">Output ripple</span>
          <span className="v">{fmtMv(metrics.rippleOutPp)}pp</span>
          <span className="metric-note">{rippleVsTargetLabel(metrics.rippleOutPp, spec)}</span>
        </div>
        <div className="metric">
          <span className="k">Vout avg</span>
          <span className="v">{fmt(metrics.voutAvg, 2, "V")}</span>
        </div>
        <div className={`metric ${headTone}`} title={hasRegulator ? DROPOUT_GLOSS : undefined}>
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
          {tubeRectifier && <span className="metric-note">excludes heater</span>}
        </div>
      </div>
      {hasRegulator && (
        <p className="gloss-foot">
          Dropout {fmt(metrics.dropout, 2, "V")}. <GlossText text={DROPOUT_GLOSS} />
        </p>
      )}
      <p className="analytic-note">
        Hand estimate (not the time-domain sim): Vpeak {fmt(analytic.vPeak, 2, "V")}, rectifier drop{" "}
        {fmt(analytic.vfTotal, 2, "V")} (Vf0+Rd·I), winding IR {fmt(analytic.xfmrDrop, 2, "V")},
        reservoir ripple {fmtMv(analytic.reservoirRipplePp)}pp, series IR{" "}
        {fmt(analytic.seriesDrop, 2, "V")} (CRC R/DCR only; cap ESR is not DC drop). Isec(rms){" "}
        {fmt(analytic.iSecRms, 2, "A")}, VA {fmt(analytic.transformerVa, 0, "VA")}. Dropout modelled
        as {fmt(metrics.dropout, 2, "V")}. First-cap peak {fmt(metrics.vFirstCapMax, 2, "V")}; raw
        valley {fmt(metrics.vPreRegMin, 2, "V")} / peak {fmt(metrics.vPreRegMax, 2, "V")}.
      </p>
      {metrics.warnings.length > 0 && (
        <div className="warnings">
          {metrics.warnings.map((w, i) => (
            <div key={i} className={`warn-item ${w.level}`}>
              {w.message}
              {isPeakClampWarning(w) && (
                <div className="warn-gloss">
                  <GlossText text={PEAK_CLAMP_GLOSS} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
