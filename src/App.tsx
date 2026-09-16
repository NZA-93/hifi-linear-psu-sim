import { useMemo, useState } from 'react'
import { LibraryPanel } from './components/LibraryPanel'
import { MetricsPanel } from './components/MetricsPanel'
import { RectifierSelector } from './components/RectifierSelector'
import { SpecPanel } from './components/SpecPanel'
import { StageList } from './components/StageList'
import { WaveformPlaceholder } from './components/WaveformPlaceholder'
import {
  addRegulator,
  addRlcFilter,
  createStarterCircuit,
  EXAMPLE_SPECS,
  removeStage,
  setRectifierType,
} from './circuit'
import { useComponentLibrary } from './hooks/useComponentLibrary'
import { simulate } from './sim/simulate'
import type { Specs } from './types'

export default function App() {
  const { library, error } = useComponentLibrary()
  const [specs, setSpecs] = useState<Specs>(EXAMPLE_SPECS)
  const [circuit, setCircuit] = useState(() => createStarterCircuit())

  const metrics = useMemo(() => simulate(circuit, specs), [circuit, specs])

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Linear PSU · scaffold</p>
          <h1>HiFi Linear PSU Dimensioner</h1>
        </div>
        <p className="banner">
          Electrical models are owned by Circuit Designer and are not implemented.
          Numbers in the spec panel are UI placeholders only.
        </p>
      </header>

      <div className="layout">
        <div className="col">
          <SpecPanel specs={specs} onChange={setSpecs} />
          <RectifierSelector
            value={circuit.rectifierType}
            onChange={(type) => setCircuit((current) => setRectifierType(current, type))}
          />
        </div>
        <StageList
          circuit={circuit}
          library={library}
          onAddRlc={() => setCircuit((current) => addRlcFilter(current))}
          onAddRegulator={() => setCircuit((current) => addRegulator(current))}
          onRemove={(id) => setCircuit((current) => removeStage(current, id))}
        />
        <MetricsPanel metrics={metrics} specs={specs} />
        <WaveformPlaceholder />
        <LibraryPanel library={library} error={error} />
      </div>
    </div>
  )
}
