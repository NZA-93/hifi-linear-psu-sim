import { useMemo, useState } from 'react'
import { LibraryPanel } from './components/LibraryPanel'
import { MetricsPanel } from './components/MetricsPanel'
import { PresetPicker } from './components/PresetPicker'
import { SpecPanel } from './components/SpecPanel'
import { StagePanel } from './components/StagePanel'
import { WaveformPlaceholder } from './components/WaveformPlaceholder'
import { draftFromPreset, fallbackDraft } from './draft'
import { useComponentLibrary, usePresetFile } from './hooks/useComponentLibrary'
import { draftToSimInput, simulateLinearPsu } from './sim/linearPsu'
import type { PresetRecord, PsuDraft } from './types'

export default function App() {
  const { library, error: libraryError } = useComponentLibrary()
  const { presetFile, error: presetError } = usePresetFile()
  const [draft, setDraft] = useState<PsuDraft | null>(null)

  const derivedDefault = useMemo(() => {
    const preset = presetFile?.presets.find((item) => item.id === presetFile.defaultPresetId)
    return preset ? draftFromPreset(preset, library) : fallbackDraft()
  }, [presetFile, library])

  const current = draft ?? derivedDefault
  const metrics = useMemo(() => simulateLinearPsu(draftToSimInput(current)), [current])

  const patch = (next: Partial<PsuDraft>) =>
    setDraft((existing) => ({ ...(existing ?? derivedDefault), ...next }))

  const applyPreset = (preset: PresetRecord) => {
    if (!preset.enabled || preset.comingSoon) return
    setDraft(draftFromPreset(preset, library))
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Linear PSU · single + rail</p>
          <h1>HiFi Linear PSU Dimensioner</h1>
        </div>
        <p className="banner">
          Metrics are <strong>closed-form approximations</strong> from{' '}
          <code>src/sim/linearPsu.ts</code>. Circuit Designer owns future formula changes. Dual ±
          rails are out of scope. Tube/active rectifiers and discrete regulators are UI stubs on
          top of the diode-bridge / dropout math.
        </p>
      </header>

      <div className="layout">
        <PresetPicker file={presetFile} selectedId={current.presetId} onSelect={applyPreset} />
        {presetError ? <p className="error-text panel-full">{presetError}</p> : null}
        <div className="col">
          <SpecPanel draft={current} onChange={patch} />
        </div>
        <StagePanel draft={current} library={library} onChange={patch} />
        <MetricsPanel metrics={metrics} rippleTargetMVpp={current.rippleTargetMVpp} />
        <WaveformPlaceholder />
        <LibraryPanel library={library} error={libraryError} />
      </div>
    </div>
  )
}
