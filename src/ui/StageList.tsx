import type { Architecture, FilterStage, SpecInput } from "../types";
import { library } from "../library";
import {
  capStageFrom,
  chokeStageFrom,
  insertStage,
  regulatorStageFrom,
  resistorStageFrom,
} from "../sim/recommend";

interface Props {
  spec: SpecInput;
  arch: Architecture;
  onChange: (next: Architecture) => void;
}

function replaceStage(arch: Architecture, id: string, next: FilterStage): Architecture {
  return { ...arch, stages: arch.stages.map((s) => (s.id === id ? next : s)) };
}

export function StageList({ spec, arch, onChange }: Props) {
  const add = (stage: FilterStage) => onChange(insertStage(arch, stage));

  return (
    <div className="panel">
      <h2>Rectifier &amp; stages</h2>
      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor="rectifier">Rectifier</label>
        <select
          id="rectifier"
          value={arch.rectifierId}
          onChange={(e) => onChange({ ...arch, rectifierId: e.target.value })}
        >
          <optgroup label="Silicon bridge">
            {library.diodes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.mpn} — {p.description}
              </option>
            ))}
          </optgroup>
          <optgroup label="Tube / valve (FW-CT)">
            {library.tubes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.mpn} — {p.description}
              </option>
            ))}
          </optgroup>
          <optgroup label="IC / active (ideal diode)">
            {library.icRectifiers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.mpn} — {p.description}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="stage-list">
        {arch.stages.map((s) => (
          <StageRow
            key={s.id}
            spec={spec}
            stage={s}
            onChange={(next) => onChange(replaceStage(arch, s.id, next))}
            onRemove={() =>
              onChange({ ...arch, stages: arch.stages.filter((x) => x.id !== s.id) })
            }
          />
        ))}
      </div>

      <div className="row-actions">
        <button className="btn" type="button" onClick={() => add(capStageFrom("eeufc1e222"))}>
          + Capacitor
        </button>
        <button className="btn" type="button" onClick={() => add(resistorStageFrom("ac05-r47"))}>
          + Series R
        </button>
        <button
          className="btn"
          type="button"
          onClick={() =>
            add(chokeStageFrom(spec.iload > 0.35 ? "bourns-1140-102k" : "hammond-193h"))
          }
        >
          + Choke L
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => add(regulatorStageFrom("lm317t", spec.vout))}
        >
          + Regulator
        </button>
      </div>
    </div>
  );
}

function StageRow({
  spec,
  stage,
  onChange,
  onRemove,
}: {
  spec: SpecInput;
  stage: FilterStage;
  onChange: (s: FilterStage) => void;
  onRemove: () => void;
}) {
  return (
    <div className="stage">
      <div className="kind">{stage.type}</div>
      {stage.type === "cap" && (
        <select
          value={stage.partId}
          onChange={(e) => onChange(capStageFrom(e.target.value, stage.id))}
        >
          {library.capacitors.map((p) => (
            <option key={p.id} value={p.id}>
              {p.mpn} · {p.C_uF} µF / {p.Vdc_V} V
            </option>
          ))}
        </select>
      )}
      {stage.type === "resistor" && (
        <select
          value={stage.partId}
          onChange={(e) => onChange(resistorStageFrom(e.target.value, stage.id))}
        >
          {library.resistors.map((p) => (
            <option key={p.id} value={p.id}>
              {p.mpn} · {p.R_ohm} Ω / {p.Pmax_W} W
            </option>
          ))}
        </select>
      )}
      {stage.type === "choke" && (
        <select
          value={stage.partId}
          onChange={(e) => onChange(chokeStageFrom(e.target.value, stage.id))}
        >
          {library.chokes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.mpn} · {p.L_mH >= 1000 ? `${p.L_mH / 1000} H` : `${p.L_mH} mH`} / {p.Imax_A} A
            </option>
          ))}
        </select>
      )}
      {stage.type === "regulator" && (
        <select
          value={stage.partId}
          onChange={(e) => onChange(regulatorStageFrom(e.target.value, spec.vout, stage.id))}
        >
          {library.regulators.map((p) => (
            <option key={p.id} value={p.id}>
              {p.mpn}
            </option>
          ))}
        </select>
      )}
      <div className="mono" style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
        {summary(stage)}
      </div>
      <button className="icon-btn" type="button" aria-label="Remove stage" onClick={onRemove}>
        ×
      </button>
    </div>
  );
}

function summary(s: FilterStage): string {
  switch (s.type) {
    case "cap":
      return `${s.C_uF} µF, ESR ${s.ESR_ohm} Ω`;
    case "resistor":
      return `${s.R_ohm} Ω`;
    case "choke":
      return `${s.L_mH} mH, DCR ${s.DCR_ohm} Ω`;
    case "regulator":
      return `set ${s.vset} V`;
  }
}
