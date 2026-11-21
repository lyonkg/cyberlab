import { useMemo, useState, type FormEvent } from 'react'
import { DEMO_USERS, simulateLogin } from '../../lib/sqli'
import { useProgress } from '../../hooks/useProgress'
import { LIMITS, clampLength } from '../../lib/validation'

const PAYLOADS: { label: string; username: string; password: string; note: string }[] = [
  { label: "' OR 1=1 --", username: "' OR 1=1 --", password: 'x', note: 'Tautologie + mise en commentaire de la vérification du mot de passe' },
  { label: "admin' --", username: "admin' --", password: 'x', note: 'Se connecter comme un utilisateur connu, sans mot de passe' },
  {
    label: "' OR '1'='1 (identifiant seul)",
    username: "' OR '1'='1",
    password: 'x',
    note: 'Échoue ! AND est prioritaire sur OR, donc le mot de passe est toujours vérifié',
  },
  { label: 'Apostrophe seule', username: "'", password: 'x', note: 'Casse la requête — montre la fuite d’informations par les erreurs' },
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
        <h3 className="font-semibold text-white">Lab : connexion vulnérable à l’injection SQL</h3>
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
        Utilisateurs de démo : alice/wonderland, bob/builder, admin/s3cret!. En mode vulnérable, essayez{' '}
        <code className="text-cyan-300">{`' OR 1=1 --`}</code> ou <code className="text-cyan-300">{`admin' --`}</code>{' '}
        comme nom d’utilisateur. La requête passe par un petit moteur SQL qui respecte les commentaires <code>--</code> et
        la priorité de AND sur OR.
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
          Nom d’utilisateur
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
          Mot de passe
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
          Se connecter
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
                <p className="text-xs text-slate-400 mb-1">Clause WHERE évaluée par la base (commentaires retirés)</p>
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
              <span className="block text-xs text-rose-300 mt-1">Caractères d’injection détectés dans la saisie.</span>
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
        <summary>Base de démo en mémoire ({DEMO_USERS.length} utilisateurs)</summary>
        <pre className="mt-2 font-mono">{JSON.stringify(DEMO_USERS, null, 2)}</pre>
      </details>
    </div>
  )
}
