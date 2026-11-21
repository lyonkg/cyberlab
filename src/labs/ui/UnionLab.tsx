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
  { label: 'ORDER BY 1', input: "' ORDER BY 1 --", note: 'Probe: column 1 exists → OK' },
  { label: 'ORDER BY 2', input: "' ORDER BY 2 --", note: 'Probe: column 2 exists → OK' },
  { label: 'ORDER BY 3', input: "' ORDER BY 3 --", note: 'Probe: column 3 exists → OK (matches schema)' },
  { label: 'ORDER BY 4', input: "' ORDER BY 4 --", note: 'Probe: out of range → error (column count is 3)' },
  {
    label: 'UNION 2 cols',
    input: "' UNION SELECT username, password FROM users --",
    note: 'Too few columns (2 ≠ 3) → error',
  },
  {
    label: 'UNION 4 cols',
    input: "' UNION SELECT null, null, null, null FROM users --",
    note: 'Too many columns (4 ≠ 3) → error',
  },
  {
    label: 'UNION leak',
    input: "' UNION SELECT null, username, password FROM users --",
    note: '3 columns: null→id, username→title, password→body',
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
        <h3 className="font-semibold text-white">UNION Attack Lab — Product Search</h3>
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
            {vulnerable ? 'Vulnerable (string concat)' : 'Safe (parameterized)'}
          </span>
        </label>
      </div>

      <p className="text-sm text-slate-400">
        The app runs{' '}
        <code className="text-cyan-300">
          SELECT id, title, body FROM products WHERE title LIKE &apos;%…%&apos;
        </code>{' '}
        — <strong className="text-slate-200">{PRODUCT_COLUMN_COUNT} columns</strong> (
        {PRODUCT_COLUMNS.join(', ')}). Close the string with a quote, then append{' '}
        <code className="text-cyan-300">ORDER BY n --</code> to probe the count, or{' '}
        <code className="text-cyan-300">UNION SELECT …</code> with exactly {PRODUCT_COLUMN_COUNT}{' '}
        expressions to append rows from another table.
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
          Search products by title
          <input
            className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
            value={input}
            onChange={(e) => {
              setInput(clampLength(e.target.value, LIMITS.sqlInput))
              setSubmitted(false)
            }}
            maxLength={LIMITS.sqlInput}
            placeholder="e.g. Patch  or  ' UNION SELECT null, username, password FROM users --"
            autoComplete="off"
          />
        </label>
        <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold">
          Search
        </button>
      </form>

      {result && (
        <div className="space-y-3">
          <div className="glass rounded-xl p-3 space-y-2">
            <div>
              <p className="text-xs text-slate-400 mb-1">Constructed query</p>
              <pre className="text-xs font-mono text-amber-200 whitespace-pre-wrap break-all">{result.query}</pre>
            </div>
            {result.vulnerable && (
              <div>
                <p className="text-xs text-slate-400 mb-1">SQL the DB evaluates (comments removed)</p>
                <pre className="text-xs font-mono text-cyan-200 whitespace-pre-wrap break-all">
                  {result.effectiveSql}
                </pre>
              </div>
            )}
            <p className="text-[11px] text-slate-500">
              Left SELECT column count: {result.columnCount} · injection chars:{' '}
              {result.injectionDetected ? 'yes' : 'no'}
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
                    <th className="p-2 text-left">source</th>
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
                            <span className="text-rose-300 font-semibold">leaked (UNION)</span>
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
          Demo tables — products ({DEMO_PRODUCTS.length} rows, {PRODUCT_COLUMN_COUNT} cols) &amp; users
        </summary>
        <pre className="mt-2 font-mono overflow-x-auto">{JSON.stringify(DEMO_PRODUCTS, null, 2)}</pre>
      </details>
    </div>
  )
}
