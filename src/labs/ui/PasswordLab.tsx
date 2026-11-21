import { useMemo, useState } from 'react'
import { checkPasswordStrength } from '../../lib/password'
import { useProgress } from '../../hooks/useProgress'
import { LIMITS, clampLength } from '../../lib/validation'

export function PasswordLab() {
  const [password, setPassword] = useState('')
  const [mfa, setMfa] = useState(false)
  const strength = useMemo(() => checkPasswordStrength(password), [password])
  const { completeLab } = useProgress()

  const colors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-400']

  return (
    <div className="space-y-4" data-testid="lab-password">
      <h3 className="font-semibold text-white">Robustesse du mot de passe et MFA</h3>
      <label className="block text-xs text-slate-400">
        Essayez un mot de passe
        <input
          type="text"
          className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
          value={password}
          onChange={(e) => {
            const next = clampLength(e.target.value, LIMITS.password)
            setPassword(next)
            if (next.length >= 8) completeLab('password')
          }}
          maxLength={LIMITS.password}
          placeholder="Tapez pour évaluer…"
        />
      </label>

      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-300">{strength.label}</span>
          <span className="text-slate-500">~{strength.entropyBits} bits d’entropie</span>
        </div>
        <div className="flex gap-1 h-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex-1 rounded-full ${i <= strength.score ? colors[strength.score] : 'bg-slate-800'}`}
            />
          ))}
        </div>
      </div>

      <ul className="space-y-1">
        {strength.checks.map((c) => (
          <li
            key={c.id}
            className={`text-sm ${c.passed ? 'text-emerald-300' : 'text-slate-500'}`}
          >
            {c.passed ? '✓' : '○'} {c.label}
          </li>
        ))}
      </ul>

      <label className="flex items-center gap-2 text-sm glass rounded-xl p-3 cursor-pointer">
        <input type="checkbox" checked={mfa} onChange={(e) => setMfa(e.target.checked)} />
        <span>
          Activer la MFA (TOTP / clé de sécurité){' '}
          <span className="text-slate-400">
            — {mfa ? 'L’attaquant doit obtenir le mot de passe ET le second facteur' : 'Un mot de passe seul peut être hameçonné ou divulgué'}
          </span>
        </span>
      </label>
    </div>
  )
}
