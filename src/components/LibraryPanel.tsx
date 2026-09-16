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
        <p className="panel-kicker">public/data/components.json · version 1</p>
      </header>
      {error ? <p className="error-text">{error}</p> : null}
      {!error && !library ? <p className="muted">Loading library…</p> : null}
      {library ? (
        <div className="library-groups">
          <LibraryTable
            title="Diodes"
            headers={['id', 'name', 'Vf', 'If_max', 'Vrrrm']}
            rows={library.diodes.map((part) => [part.id, part.name, part.Vf, part.If_max, part.Vrrrm])}
          />
          <LibraryTable
            title="Capacitors"
            headers={['id', 'name', 'C_uF', 'V_rated', 'ESR_ohm', 'type']}
            rows={library.capacitors.map((part) => [
              part.id,
              part.name,
              part.C_uF,
              part.V_rated,
              part.ESR_ohm,
              part.type,
            ])}
          />
          <LibraryTable
            title="Resistors"
            headers={['id', 'name', 'R_ohm', 'P_max_W']}
            rows={library.resistors.map((part) => [part.id, part.name, part.R_ohm, part.P_max_W])}
          />
          <LibraryTable
            title="Chokes"
            headers={['id', 'name', 'L_H', 'I_sat_mA', 'DCR_ohm', 'notes']}
            rows={library.chokes.map((part) => [
              part.id,
              part.name,
              part.L_H,
              part.I_sat_mA,
              part.DCR_ohm,
              part.notes ?? '',
            ])}
          />
          <LibraryTable
            title="Regulators"
            headers={['id', 'name', 'type', 'Vdropout', 'I_max_A', 'PSRR_dB_120Hz', 'Vref', 'notes']}
            rows={library.regulators.map((part) => [
              part.id,
              part.name,
              part.type,
              part.Vdropout,
              part.I_max_A,
              part.PSRR_dB_120Hz,
              part.Vref === null ? 'n/a' : part.Vref,
              part.notes ?? '',
            ])}
          />
        </div>
      ) : null}
    </section>
  )
}

function LibraryTable({
  title,
  headers,
  rows,
}: {
  title: string
  headers: string[]
  rows: (string | number)[][]
}) {
  return (
    <div className="library-table-wrap">
      <h3 className="subhead">{title}</h3>
      <table className="library-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])}>
              {row.map((cell, index) => (
                <td key={`${row[0]}-${headers[index]}`}>{index === 0 ? <code>{cell}</code> : cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
