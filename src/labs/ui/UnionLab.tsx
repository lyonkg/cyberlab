import { useMemo, useState, type FormEvent } from 'react'
import {
  DEMO_PRODUCTS,
  PRODUCT_COLUMN_COUNT,
  PRODUCT_COLUMNS,
  simulateSearch,
} from '../../lib/sqlSelect'
import { useProgress } from '../../hooks/useProgress'
import { LIMITS, clampLength } from '../../lib/validation'

const PAYLOADS: { label: string; input: string; note: string }[] = [
  { label: 'ORDER BY 1', input: "' ORDER BY 1 --", note: 'Sonde : la colonne 1 existe → OK' },
  { label: 'ORDER BY 2', input: "' ORDER BY 2 --", note: 'Sonde : la colonne 2 existe → OK' },
  { label: 'ORDER BY 3', input: "' ORDER BY 3 --", note: 'Sonde : la colonne 3 existe → OK (correspond au schéma)' },
  { label: 'ORDER BY 4', input: "' ORDER BY 4 --", note: 'Sonde : hors limites → erreur (il y a 3 colonnes)' },
  {
    label: 'UNION 2 colonnes',
    input: "' UNION SELECT username, password FROM users --",
    note: 'Pas assez de colonnes (2 ≠ 3) → erreur',
  },
  {
    label: 'UNION 4 colonnes',
    input: "' UNION SELECT null, null, null, null FROM users --",
    note: 'Trop de colonnes (4 ≠ 3) → erreur',
  },
  {
    label: 'Fuite par UNION',
    input: "' UNION SELECT null, username, password FROM users --",
    note: '3 colonnes : null→id, username→title, password→body',
  },
]

export function UnionLab() {
  const [input, setInput] = useState('')
  const [vulnerable, setVulnerable] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const { completeLab } = useProgress()

  const result = useMemo(
    () => (submitted ? simulateSearch(input, vulnerable) : null),
    [submitted, input, vulnerable],
  )

  const run = (value: string) => {
    setInput(clampLength(value, LIMITS.sqlInput))
    setSubmitted(true)
    completeLab('sqli-union')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    completeLab('sqli-union')
  }

  return (
    <div className="space-y-4" data-testid="lab-sqli-union">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white">Lab d’attaque UNION — recherche de produits</h3>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={vulnerable}
            onChange={(e) => {
              setVulnerable(e.target.checked)
              setSubmitted(false)
            }}
          />
          <span className={vulnerable ? 'text-rose-300' : 'text-emerald-300'}>
            {vulnerable ? 'Vulnérable (concaténation de chaînes)' : 'Sécurisé (requête paramétrée)'}
          </span>
        </label>
      </div>

      <p className="text-sm text-slate-400">
        L’application exécute{' '}
        <code className="text-cyan-300">
          SELECT id, title, body FROM products WHERE title LIKE &apos;%…%&apos;
        </code>{' '}
        — <strong className="text-slate-200">{PRODUCT_COLUMN_COUNT} colonnes</strong> (
        {PRODUCT_COLUMNS.join(', ')}). Fermez la chaîne avec une apostrophe, puis ajoutez{' '}
        <code className="text-cyan-300">ORDER BY n --</code> pour sonder le nombre de colonnes, ou{' '}
        <code className="text-cyan-300">UNION SELECT …</code> avec exactement {PRODUCT_COLUMN_COUNT}{' '}
        expressions pour ajouter des lignes d’une autre table.
      </p>

      <div className="flex flex-wrap gap-2">
        {PAYLOADS.map((p) => (
          <button
            key={p.label}
            type="button"
            title={p.note}
            onClick={() => run(p.input)}
            className="px-2.5 py-1 rounded-lg border border-slate-700 text-xs font-mono text-slate-300 hover:border-cyan-500/50"
          >
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="glass rounded-xl p-4 space-y-3 max-w-xl">
        <label className="block text-xs text-slate-400">
          Rechercher des produits par titre
          <input
            className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
            value={input}
            onChange={(e) => {
              setInput(clampLength(e.target.value, LIMITS.sqlInput))
              setSubmitted(false)
            }}
            maxLength={LIMITS.sqlInput}
            placeholder="ex. Patch  ou  ' UNION SELECT null, username, password FROM users --"
            autoComplete="off"
          />
        </label>
        <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold">
          Rechercher
        </button>
      </form>

      {result && (
        <div className="space-y-3">
          <div className="glass rounded-xl p-3 space-y-2">
            <div>
              <p className="text-xs text-slate-400 mb-1">Requête construite</p>
              <pre className="text-xs font-mono text-amber-200 whitespace-pre-wrap break-all">{result.query}</pre>
            </div>
            {result.vulnerable && (
              <div>
                <p className="text-xs text-slate-400 mb-1">SQL évalué par la base (commentaires retirés)</p>
                <pre className="text-xs font-mono text-cyan-200 whitespace-pre-wrap break-all">
                  {result.effectiveSql}
                </pre>
              </div>
            )}
            <p className="text-[11px] text-slate-500">
              Colonnes du SELECT de gauche : {result.columnCount} · caractères d’injection :{' '}
              {result.injectionDetected ? 'oui' : 'non'}
            </p>
          </div>

          <div
            className={`rounded-xl p-3 border text-sm ${
              result.error
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-100'
                : result.leakedRowIndexes.length
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-100'
                  : result.rows.length
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-100'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            {result.message}
          </div>

          {result.rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    {result.columns.map((c) => (
                      <th key={c} className="p-2 text-left font-mono">
                        {c}
                      </th>
                    ))}
                    <th className="p-2 text-left">origine</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => {
                    const leaked = result.leakedRowIndexes.includes(i)
                    return (
                      <tr
                        key={i}
                        className={`border-t border-slate-800 ${
                          leaked ? 'bg-rose-500/15 text-rose-100' : ''
                        }`}
                      >
                        {result.columns.map((c) => (
                          <td key={c} className="p-2 font-mono">
                            {row[c] === null ? (
                              <span className="text-slate-500">NULL</span>
                            ) : (
                              String(row[c])
                            )}
                          </td>
                        ))}
                        <td className="p-2">
                          {leaked ? (
                            <span className="text-rose-300 font-semibold">fuite (UNION)</span>
                          ) : (
                            <span className="text-slate-500">products</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <details className="text-xs text-slate-500">
        <summary>
          Tables de démo — products ({DEMO_PRODUCTS.length} lignes, {PRODUCT_COLUMN_COUNT} colonnes) et users
        </summary>
        <pre className="mt-2 font-mono overflow-x-auto">{JSON.stringify(DEMO_PRODUCTS, null, 2)}</pre>
      </details>
    </div>
  )
}
