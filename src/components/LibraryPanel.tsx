import type { ComponentLibrary } from '../types'

interface LibraryPanelProps {
  library: ComponentLibrary | null
  error: string | null
}

export function LibraryPanel({ library, error }: LibraryPanelProps) {
  return (
    <section className="panel panel-full" aria-labelledby="library-heading">
      <header className="panel-header">
        <h2 id="library-heading">Component library</h2>
        <p className="panel-kicker">editable JSON · public/components.json</p>
      </header>
      {error ? <p className="error-text">{error}</p> : null}
      {!error && !library ? <p className="muted">Loading library…</p> : null}
      {library ? (
        <div className="library-table-wrap">
          <table className="library-table">
            <thead>
              <tr>
                <th>id</th>
                <th>type</th>
                <th>label</th>
                <th>params</th>
                <th>notes</th>
              </tr>
            </thead>
            <tbody>
              {library.parts.map((part) => (
                <tr key={part.id}>
                  <td>
                    <code>{part.id}</code>
                  </td>
                  <td>{part.type}</td>
                  <td>{part.label}</td>
                  <td>
                    <code>{JSON.stringify(part.params)}</code>
                  </td>
                  <td>{part.notes ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
