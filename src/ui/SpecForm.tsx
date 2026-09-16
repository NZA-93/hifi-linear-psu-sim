import type { SpecInput } from "../types";

interface Props {
  spec: SpecInput;
  onChange: (next: SpecInput) => void;
  onRecommend: () => void;
}

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function optNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function SpecForm({ spec, onChange, onRecommend }: Props) {
  const set = (patch: Partial<SpecInput>) => onChange({ ...spec, ...patch });

  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        onRecommend();
      }}
    >
      <h2>Targets</h2>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="vout">Vout (V DC)</label>
          <input
            id="vout"
            type="number"
            step="0.1"
            min="0.5"
            value={spec.vout}
            onChange={(e) => set({ vout: num(e.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="iload">Iload (A)</label>
          <input
            id="iload"
            type="number"
            step="0.01"
            min="0.001"
            value={spec.iload}
            onChange={(e) => set({ iload: num(e.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="ripple">Ripple target</label>
          <input
            id="ripple"
            type="number"
            step="0.1"
            min="0"
            value={spec.rippleValue}
            onChange={(e) => set({ rippleValue: num(e.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="rippleUnit">Ripple unit</label>
          <select
            id="rippleUnit"
            value={spec.rippleUnit}
            onChange={(e) => set({ rippleUnit: e.target.value as SpecInput["rippleUnit"] })}
          >
            <option value="mVpp">mV peak-to-peak</option>
            <option value="percent">% of Vout</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="mainsHz">Mains frequency</label>
          <select
            id="mainsHz"
            value={spec.mainsHz}
            onChange={(e) => set({ mainsHz: Number(e.target.value) as 50 | 60 })}
          >
            <option value={50}>50 Hz</option>
            <option value={60}>60 Hz</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="mainsVac">Mains VAC</label>
          <input
            id="mainsVac"
            type="number"
            step="1"
            value={spec.mainsVac}
            onChange={(e) => set({ mainsVac: num(e.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="vsec">Secondary VAC (RMS)</label>
          <input
            id="vsec"
            type="number"
            step="0.1"
            placeholder="auto"
            value={spec.vsecRms ?? ""}
            onChange={(e) => set({ vsecRms: optNum(e.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="headroom">Headroom (V)</label>
          <input
            id="headroom"
            type="number"
            step="0.1"
            value={spec.headroomV}
            onChange={(e) => set({ headroomV: num(e.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="np">Turns Np (optional)</label>
          <input
            id="np"
            type="number"
            placeholder="e.g. 2300"
            value={spec.turnsPrimary ?? ""}
            onChange={(e) => set({ turnsPrimary: optNum(e.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="ns">Turns Ns (optional)</label>
          <input
            id="ns"
            type="number"
            placeholder="e.g. 150"
            value={spec.turnsSecondary ?? ""}
            onChange={(e) => set({ turnsSecondary: optNum(e.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="regpct">Transformer regulation</label>
          <select
            id="regpct"
            value={spec.transformerRegulation}
            onChange={(e) => set({ transformerRegulation: num(e.target.value) })}
          >
            <option value={0.05}>5% (stiff)</option>
            <option value={0.08}>8% (typical EI)</option>
            <option value={0.12}>12% (small R-core)</option>
            <option value={0.2}>20% (tiny)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="includeReg">Series regulator</label>
          <select
            id="includeReg"
            value={spec.includeRegulator ? "yes" : "no"}
            onChange={(e) => set({ includeRegulator: e.target.value === "yes" })}
          >
            <option value="yes">Include in suggestion</option>
            <option value="no">Unregulated raw DC</option>
          </select>
        </div>
        <p className="hint">
          Leave secondary blank to auto-pick a common VAC. Turns ratio helper: Vsec = Vmains ×
          Ns/Np. Silicon/IC: full winding across the bridge. Tube: RMS per anode (each side of CT).
        </p>
      </div>
      <div className="row-actions">
        <button className="btn btn-primary" type="submit">
          Recommend architecture
        </button>
      </div>
    </form>
  );
}
