import { useMemo, useState, type FormEvent } from 'react'
import { DEMO_ORDERS, ORDER_COLUMN_COUNT, simulateOrderLookup } from '../../lib/sql'
import { useProgress } from '../../hooks/useProgress'

const PAYLOADS = [
  { label: '1001', input: '1001', note: 'Legitimate order id (alice)' },
  { label: "' OR 1=1 --", input: "' OR 1=1 --", note: 'Widen the JOIN — every customer order leaks' },
  {
    label: "' UNION SELECT…",
    input: "' UNION SELECT null, username, password, role FROM users --",
    note: 'UNION against the 4-column JOIN result',
  },
  { label: "admin' --", input: "admin' --", note: 'Syntax/type noise — useful for error messages' },
]

export function JoinLab() {
  const [input, setInput] = useState('1001')
  const [vulnerable, setVulnerable] = useState(true)
  const [submitted, setSubmitted] = useState(true)
  const { completeLab } = useProgress()
  const result = useMemo(
    () => (submitted ? simulateOrderLookup(input, vulnerable) : null),
    [submitted, input, vulnerable],
  )

  const run = (value: string) => {
    setInput(value)
    setSubmitted(true)
    completeLab('sqli-join')
  }

  return (
    <div className="space-y-4" data-testid="lab-sqli-join">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white">JOIN Attack Lab — Order Lookup</h3>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={vulnerable}
            onChange={(e) => {
              setVulnerable(e.target.checked)
              setSubmitted(true)
            }}
          />
          <span className={vulnerable ? 'text-rose-300' : 'text-emerald-300'}>
            {vulnerable ? 'Vulnerable (string concat)' : 'Safe (parameterized)'}
          </span>
        </label>
      </div>
      <p className="text-sm text-slate-400">
        The page runs a multi-table query (
        <code className="text-cyan-300">orders o INNER JOIN users u</code>) and filters by order id —{' '}
        <strong className="text-slate-200">{ORDER_COLUMN_COUNT} result columns</strong>. Closing the string
        with <code className="text-cyan-300">&apos; OR 1=1 --</code> returns every customer&apos;s order and
        shipping address through the JOIN.
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
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          run(input)
        }}
        className="glass rounded-xl p-4 space-y-3 max-w-xl"
      >
        <label className="block text-xs text-slate-400">
          Order id
          <input
            className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setSubmitted(false)
            }}
            autoComplete="off"
          />
        </label>
        <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold">
          Look up
        </button>
        <p className="text-[11px] text-slate-500">Demo ids: {DEMO_ORDERS.map((o) => o.id).join(', ')}</p>
      </form>
      {result && <ResultPanel result={result} />}
    </div>
  )
}

function ResultPanel({
  result,
}: {
  result: ReturnType<typeof simulateOrderLookup>
}) {
  return (
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
      </div>
      <div
        className={`rounded-xl p-3 border text-sm ${
          result.error
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-100'
            : result.leakedRowIndexes.length
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-100'
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
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-t border-slate-800 ${
                    result.leakedRowIndexes.includes(i) ? 'bg-rose-500/15 text-rose-100' : ''
                  }`}
                >
                  {result.columns.map((c) => (
                    <td key={c} className="p-2 font-mono">
                      {row[c] === null ? <span className="text-slate-500">NULL</span> : String(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
