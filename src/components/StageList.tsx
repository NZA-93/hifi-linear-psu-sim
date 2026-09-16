import { partById } from '../library'
import type { Circuit, ComponentLibrary } from '../types'

interface StageListProps {
  circuit: Circuit
  library: ComponentLibrary | null
  onAddRlc: () => void
  onAddRegulator: () => void
  onRemove: (stageId: string) => void
}

const KIND_BADGE: Record<string, string> = {
  transformer: 'XFMR',
  rectifier: 'RECT',
  cap_filter: 'C',
  rlc_filter: 'RLC',
  regulator: 'REG',
}

export function StageList({
  circuit,
  library,
  onAddRlc,
  onAddRegulator,
  onRemove,
}: StageListProps) {
  return (
    <section className="panel panel-span" aria-labelledby="stages-heading">
      <header className="panel-header">
        <h2 id="stages-heading">Circuit stages</h2>
        <p className="panel-kicker">Starter topology — UI state only</p>
      </header>
      <ol className="stage-list">
        {circuit.stages.map((stage, index) => {
          const part = partById(library, stage.partId)
          return (
            <li key={stage.id} className="stage-row">
              <span className="stage-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="stage-badge">{KIND_BADGE[stage.kind] ?? stage.kind}</span>
              <div className="stage-copy">
                <strong>{stage.label}</strong>
                <span>
                  {part
                    ? `${part.label} · params are placeholders`
                    : stage.partId
                      ? `library id: ${stage.partId}`
                      : 'no library part assigned'}
                </span>
              </div>
              {stage.removable ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => onRemove(stage.id)}
                >
                  Remove
                </button>
              ) : (
                <span className="locked">fixed</span>
              )}
            </li>
          )
        })}
      </ol>
      <div className="stage-actions">
        <button type="button" className="btn" onClick={onAddRlc}>
          Add RLC filter
        </button>
        <button type="button" className="btn" onClick={onAddRegulator}>
          Add regulator
        </button>
      </div>
    </section>
  )
}
