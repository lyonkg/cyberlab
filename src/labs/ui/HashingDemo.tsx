import { useEffect, useState } from 'react'
import { getLabProvider } from '../providers'
import { useProgress } from '../../hooks/useProgress'
import { LIMITS, clampLength } from '../../lib/validation'

function randomSalt(len = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function HashingDemo() {
  const [password, setPassword] = useState('password123')
  const [salt, setSalt] = useState(() => randomSalt())
  const [digest, setDigest] = useState('')
  const [unsalted, setUnsalted] = useState('')
  const [error, setError] = useState('')
  const provider = getLabProvider()
  const { completeLab } = useProgress()

  useEffect(() => {
    let cancelled = false
    setError('')
    ;(async () => {
      try {
        const salted = await provider.hashPassword(password, salt)
        const plain = await provider.hashPassword(password, '')
        if (!cancelled) {
          setDigest(salted.digestHex)
          setUnsalted(plain.digestHex)
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Le fournisseur de hachage n’est pas disponible.'
          setDigest('')
          setUnsalted('')
          setError(msg)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [password, salt, provider])

  return (
    <div className="space-y-4" data-testid="lab-hashing">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white">Démo hachage et salage</h3>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          via le fournisseur {provider.mode === 'real' ? 'réel' : 'simulé'}
        </span>
      </div>
      <label className="block text-xs text-slate-400">
        Mot de passe
        <input
          className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
          value={password}
          onChange={(e) => {
            setPassword(clampLength(e.target.value, LIMITS.password))
            completeLab('hashing')
          }}
          maxLength={LIMITS.password}
        />
      </label>
      <div className="flex gap-2 items-end">
        <label className="block text-xs text-slate-400 flex-1">
          Salt
          <input
            className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
            value={salt}
            onChange={(e) => setSalt(clampLength(e.target.value, LIMITS.salt))}
            maxLength={LIMITS.salt}
          />
        </label>
        <button
          type="button"
          onClick={() => setSalt(randomSalt())}
          className="px-3 py-2 rounded-lg border border-slate-600 text-sm"
        >
          Nouveau salt
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-slate-400">SHA-256(salt:mot_de_passe)</p>
          <p className="font-mono text-[11px] text-cyan-200 break-all mt-1">{digest || '…'}</p>
        </div>
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-slate-400">SHA-256(mot_de_passe) sans salt</p>
          <p className="font-mono text-[11px] text-rose-200/80 break-all mt-1">{unsalted || '…'}</p>
        </div>
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <p className="text-xs text-slate-400">
        Même mot de passe + salt différent ⇒ hash différent. Les hash sans salt de mots de passe courants se retrouvent
        trivialement dans des rainbow tables. En production, utilisez Argon2/bcrypt/scrypt, pas un SHA-256 brut.
      </p>
    </div>
  )
}
