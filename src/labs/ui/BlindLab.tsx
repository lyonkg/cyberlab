import { useMemo, useState, type FormEvent } from 'react'
import { simulateBlind } from '../../lib/sql'
import { useProgress } from '../../hooks/useProgress'

const PAYLOADS = [
  {
    label: "SUBSTR = 's' (vrai)",
    input: "' AND (SELECT SUBSTR(password,1,1) FROM users WHERE username='admin')='s' --",
    note: 'Le mot de passe d’admin commence par s → des lignes sont renvoyées',
  },
  {
    label: "SUBSTR = 'x' (faux)",
    input: "' AND (SELECT SUBSTR(password,1,1) FROM users WHERE username='admin')='x' --",
    note: 'Mauvaise supposition → 0 ligne (oracle booléen faux)',
  },
  {
    label: 'EXISTS api_keys',
    input: "' AND EXISTS(SELECT 1 FROM api_keys) --",
    note: 'La table cachée existe → vrai',
  },
  {
    label: 'EXISTS secrets',
    input: "' AND EXISTS(SELECT 1 FROM secrets) --",
    note: 'Table absente → erreur (c’est aussi un oracle)',
  },
  {
    label: 'IN (admins)',
    input: "' AND 'admin' IN (SELECT username FROM users WHERE role='admin') --",
    note: 'La sous-requête IN confirme qu’une valeur est présente',
  },
]

export function BlindLab() {
  const [input, setInput] = useState(PAYLOADS[0].input)
  const [vulnerable, setVulnerable] = useState(true)
  const [submitted, setSubmitted] = useState(true)
  const { completeLab } = useProgress()
  const result = useMemo(
    () => (submitted ? simulateBlind(input, vulnerable) : null),
    [submitted, input, vulnerable],
  )

  const run = (value: string) => {
    setInput(value)
    setSubmitted(true)
    completeLab('sqli-blind')
  }

  return (
    <div className="space-y-4" data-testid="lab-sqli-blind">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white">Lab sous-requêtes / injection booléenne à l’aveugle</h3>
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
            {vulnerable ? 'Vulnérable (concaténation de chaînes)' : 'Sécurisé (requête paramétrée)'}
          </span>
        </label>
      </div>
      <p className="text-sm text-slate-400">
        Même page de recherche de produits que le lab UNION, mais le payload pose une question oui/non avec une
        sous-requête scalaire, <code className="text-cyan-300">EXISTS</code> ou <code className="text-cyan-300">IN
        (SELECT …)</code>. Des lignes renvoyées ⇒ vrai ; aucune ligne ⇒ faux. Les attaquants parcourent{' '}
        <code className="text-cyan-300">SUBSTR(password, i, 1)</code> caractère par caractère.
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
          Recherche / payload
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
          Sonder
        </button>
      </form>
      {result && (
        <div className="space-y-3">
          <div className="glass rounded-xl p-3 space-y-2">
            <pre className="text-xs font-mono text-amber-200 whitespace-pre-wrap break-all">{result.query}</pre>
            {result.vulnerable && (
              <pre className="text-xs font-mono text-cyan-200 whitespace-pre-wrap break-all">
                {result.effectiveSql}
              </pre>
            )}
          </div>
          <div
            className={`rounded-xl p-3 border text-sm ${
              result.error
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-100'
                : result.oracleTrue
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-100'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <p className="font-semibold mb-1">
              Oracle :{' '}
              {result.error ? 'ERREUR' : result.oracleTrue ? 'VRAI (lignes renvoyées)' : 'FAUX (0 ligne)'}
            </p>
            {result.message}
          </div>
          {result.rows.length > 0 && (
            <p className="text-xs text-slate-500">{result.rows.length} produit(s) visible(s) par l’attaquant.</p>
          )}
        </div>
      )}
    </div>
  )
}
