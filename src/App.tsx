import { useMemo, useState } from "react";
import type { Architecture, SpecInput } from "./types";
import { defaultSpec, recommend, simulate } from "./sim";
import { SpecForm } from "./ui/SpecForm";
import { StageList } from "./ui/StageList";
import { BlockDiagram } from "./ui/BlockDiagram";
import { ResultsPanel } from "./ui/ResultsPanel";
import { WaveformPlot } from "./ui/WaveformPlot";
import "./App.css";

const initialSpec = defaultSpec();
const initialArch = recommend(initialSpec, "kbu8m");

export default function App() {
  const [spec, setSpec] = useState<SpecInput>(initialSpec);
  const [arch, setArch] = useState<Architecture>(initialArch);

  const result = useMemo(() => simulate(spec, arch), [spec, arch]);

  return (
    <div className="app">
      <header className="hero">
        <div>
          <div className="badge">v1 · linear only</div>
          <h1>HiFi linear PSU dimensioning</h1>
          <p>
            Set a DC rail, current, and ripple budget. The app proposes a rectifier + CRC/CLC
            filter (and a series regulator), then runs a browser time-step of the ladder — not
            SPICE, but enough to compare silicon, valve, and ideal-diode bridges.
          </p>
        </div>
        <div className="hero-meta">
          Demo: 12 V / 1 A / 50 mVpp
          <br />
          Swap the rectifier or add a choke
        </div>
      </header>

      <div className="layout">
        <SpecForm
          spec={spec}
          onChange={setSpec}
          onRecommend={() => setArch(recommend(spec, arch.rectifierId))}
        />
        <div className="stack">
          <BlockDiagram arch={arch} />
          <StageList spec={spec} arch={arch} onChange={setArch} />
          <ResultsPanel spec={spec} result={result} />
          <WaveformPlot waveform={result.waveform} />
        </div>
      </div>
    </div>
  );
}
