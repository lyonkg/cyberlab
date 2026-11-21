import { useMemo, useState, type FormEvent } from 'react'
import { DEMO_USERS, simulateLogin } from '../../lib/sqli'
import { useProgress } from '../../hooks/useProgress'
import { LIMITS, clampLength } from '../../lib/validation'

const PAYLOADS: { label: string; username: string; password: string; note: string }[] = [
  { label: "' OR 1=1 --", username: "' OR 1=1 --", password: 'x', note: 'Tautology + comment out the password check' },
  { label: "admin' --", username: "admin' --", password: 'x', note: 'Log in as a known user, skip the password' },
  {
    label: "' OR '1'='1 (user only)",
    username: "' OR '1'='1",
    password: 'x',
    note: 'Fails! AND binds tighter than OR, so password still checked',
  },
  { label: 'Lone quote', username: "'", password: 'x', note: 'Breaks the query — shows error leakage' },
]

export function SqliLab() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [vulnerable, setVulnerable] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const { completeLab } = useProgress()

  const result = useMemo(
    () => (submitted ? simulateLogin(username, password, vulnerable) : null),
    [submitted, username, password, vulnerable],
  )

  const tryLogin = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    completeLab('sqli-login')
  }

  return (
    <div className="space-y-4" data-testid="lab-sqli">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white">SQL Injection Login Lab</h3>
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
        Demo users: alice/wonderland, bob/builder, admin/s3cret!. With vulnerable mode on, try{' '}
        <code className="text-cyan-300">{`' OR 1=1 --`}</code> or <code className="text-cyan-300">{`admin' --`}</code>{' '}
        as the username. The query runs through a small SQL engine that honors <code>--</code> comments and
        AND-before-OR precedence.
      </p>

      <div className="flex flex-wrap gap-2">
        {PAYLOADS.map((p) => (
          <button
            key={p.label}
            type="button"
            title={p.note}
            onClick={() => {
              setUsername(p.username)
              setPassword(p.password)
              setSubmitted(true)
              completeLab('sqli-login')
            }}
            className="px-2.5 py-1 rounded-lg border border-slate-700 text-xs font-mono text-slate-300 hover:border-cyan-500/50"
          >
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={tryLogin} className="glass rounded-xl p-4 space-y-3 max-w-md">
        <label className="block text-xs text-slate-400">
          Username
          <input
            className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
            value={username}
            onChange={(e) => {
              setUsername(clampLength(e.target.value, LIMITS.sqlInput))
              setSubmitted(false)
            }}
            maxLength={LIMITS.sqlInput}
            autoComplete="off"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Password
          <input
            type="text"
            className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
            value={password}
            onChange={(e) => {
              setPassword(clampLength(e.target.value, LIMITS.sqlInput))
              setSubmitted(false)
            }}
            maxLength={LIMITS.sqlInput}
            autoComplete="off"
          />
        </label>
        <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold">
          Login
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
                <p className="text-xs text-slate-400 mb-1">WHERE clause the DB evaluates (comments removed)</p>
                <pre className="text-xs font-mono text-cyan-200 whitespace-pre-wrap break-all">
                  {result.effectiveWhere}
                </pre>
              </div>
            )}
          </div>
          <div
            className={`rounded-xl p-3 border text-sm ${
              result.error
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-100'
                : result.bypassed
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-100'
                  : result.loggedIn
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-100'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            {result.message}
            {result.injectionDetected && (
              <span className="block text-xs text-rose-300 mt-1">Injection characters detected in input.</span>
            )}
          </div>
          {result.rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="p-2 text-left">id</th>
                    <th className="p-2 text-left">username</th>
                    <th className="p-2 text-left">password</th>
                    <th className="p-2 text-left">role</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-800">
                      <td className="p-2">{r.id}</td>
                      <td className="p-2">{r.username}</td>
                      <td className="p-2 font-mono">{r.password}</td>
                      <td className="p-2">{r.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <details className="text-xs text-slate-500">
        <summary>In-memory demo DB ({DEMO_USERS.length} users)</summary>
        <pre className="mt-2 font-mono">{JSON.stringify(DEMO_USERS, null, 2)}</pre>
      </details>
    </div>
  )
}
