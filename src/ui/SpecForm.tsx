import type { SpecInput } from "../types";
import { NumberField } from "./NumberField";

interface Props {
  spec: SpecInput;
  onChange: (next: SpecInput) => void;
  onRecommend: () => void;
}

export function SpecForm({ spec, onChange, onRecommend }: Props) {
  const set = (patch: Partial<SpecInput>) => onChange({ ...spec, ...patch });

  return (
    <form
      className="panel"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onRecommend();
      }}
    >
      <h2>Targets</h2>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="vout">Vout (V DC)</label>
          <NumberField
            id="vout"
            min={0.5}
            value={spec.vout}
            onChange={(vout) => set({ vout })}
          />
        </div>
        <div className="field">
          <label htmlFor="iload">Iload (A)</label>
          <NumberField
            id="iload"
            min={0.001}
            value={spec.iload}
            onChange={(iload) => set({ iload })}
          />
        </div>
        <div className="field">
          <label htmlFor="ripple">Ripple target</label>
          <NumberField
            id="ripple"
            min={0}
            value={spec.rippleValue}
            onChange={(rippleValue) => set({ rippleValue })}
          />
        </div>
        <div className="field">
          <label htmlFor="rippleUnit">Ripple unit</label>
          <select
            id="rippleUnit"
            value={spec.rippleUnit}
            onChange={(e) => set({ rippleUnit: e.target.value as SpecInput["rippleUnit"] })}
          >
            <option value="mVpp">mVpp</option>
            <option value="percent">% of Vout</option>
          </select>
        </div>
      </div>

      <details className="advanced">
        <summary>Advanced</summary>
        <div className="form-grid">
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
            <NumberField
              id="mainsVac"
              min={1}
              value={spec.mainsVac}
              onChange={(mainsVac) => set({ mainsVac })}
            />
          </div>
          <div className="field">
            <label htmlFor="vsec">Secondary VAC (RMS)</label>
            <NumberField
              id="vsec"
              optional
              min={0}
              placeholder="auto"
              value={spec.vsecRms}
              onChange={(vsecRms) => set({ vsecRms })}
            />
          </div>
          <div className="field">
            <label htmlFor="headroom">Headroom (V)</label>
            <NumberField
              id="headroom"
              min={0}
              value={spec.headroomV}
              onChange={(headroomV) => set({ headroomV })}
            />
          </div>
          <div className="field">
            <label htmlFor="np">Turns Np (optional)</label>
            <NumberField
              id="np"
              optional
              min={0}
              placeholder="e.g. 2300"
              value={spec.turnsPrimary}
              onChange={(turnsPrimary) => set({ turnsPrimary })}
            />
          </div>
          <div className="field">
            <label htmlFor="ns">Turns Ns (optional)</label>
            <NumberField
              id="ns"
              optional
              min={0}
              placeholder="e.g. 150"
              value={spec.turnsSecondary}
              onChange={(turnsSecondary) => set({ turnsSecondary })}
            />
          </div>
          <div className="field">
            <label htmlFor="regpct">Transformer regulation</label>
            <select
              id="regpct"
              value={spec.transformerRegulation}
              onChange={(e) => set({ transformerRegulation: Number(e.target.value) })}
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
          {/* TODO(circuit-designer): tube EE gloss for CT / RMS-per-anode / clamp / dropout — do not invent claims. */}
          <p className="hint">
            Leave secondary blank to auto-pick a common VAC. Turns ratio helper: Vsec = Vmains ×
            Ns/Np.
          </p>
        </div>
      </details>

      <div className="row-actions">
        <button className="btn btn-primary" type="submit">
          Recommend architecture
        </button>
      </div>
    </form>
  );
}
