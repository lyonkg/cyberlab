import { useState } from 'react'
import { decryptAesGcm, encryptAesGcm, PBKDF2_ITERATIONS, type AesEnvelope } from '../../lib/aes'
import { useProgress } from '../../hooks/useProgress'
import { LIMITS, clampLength } from '../../lib/validation'

export function AesDemo() {
  const [plain, setPlain] = useState('Message ultra-secret')
  const [pass, setPass] = useState('correct horse battery staple')
  const [decryptPass, setDecryptPass] = useState('correct horse battery staple')
  const [env, setEnv] = useState<AesEnvelope | null>(null)
  const [recovered, setRecovered] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ms, setMs] = useState<number | null>(null)
  const { completeLab } = useProgress()

  const runEncrypt = async () => {
    setError('')
    setBusy(true)
    try {
      const t0 = performance.now()
      const e = await encryptAesGcm(plain, pass)
      setMs(Math.round(performance.now() - t0))
      setEnv(e)
      setRecovered('')
      completeLab('aes')
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const runDecrypt = async () => {
    if (!env) return
    setError('')
    setBusy(true)
    try {
      setRecovered(await decryptAesGcm(env.packedB64, decryptPass))
    } catch {
      setError('Échec du déchiffrement — mauvaise phrase secrète ou texte chiffré altéré (authentication tag mismatch : le tag d’authentification AES-GCM ne correspond pas).')
      setRecovered('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4" data-testid="lab-aes">
      <h3 className="font-semibold text-white">AES-256-GCM avec PBKDF2 (Web Crypto)</h3>
      <p className="text-sm text-slate-400">
        Votre phrase secrète est étirée en clé de 256 bits avec PBKDF2-HMAC-SHA-256 ({PBKDF2_ITERATIONS.toLocaleString('fr-FR')}{' '}
        itérations) et un salt aléatoire de 16 octets. Chaque chiffrement utilise aussi un nouvel IV (nonce) aléatoire de 12 octets. Le salt et
        l’IV ne sont pas secrets : ils sont stockés à côté du texte chiffré.
      </p>
      <label className="block text-xs text-slate-400">
        Texte en clair
        <input
          className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          value={plain}
          onChange={(e) => setPlain(clampLength(e.target.value, LIMITS.aesPlain))}
          maxLength={LIMITS.aesPlain}
        />
      </label>
      <label className="block text-xs text-slate-400">
        Phrase secrète (chiffrement)
        <input
          className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
          value={pass}
          onChange={(e) => setPass(clampLength(e.target.value, LIMITS.passphrase))}
          maxLength={LIMITS.passphrase}
        />
      </label>
      <button
        type="button"
        onClick={runEncrypt}
        disabled={busy}
        className="px-3 py-1.5 rounded-lg bg-violet-500 text-white text-sm font-semibold disabled:opacity-50"
      >
        {busy ? 'Calcul…' : 'Chiffrer'}
      </button>

      {env && (
        <div className="glass rounded-xl p-3 space-y-2 text-xs">
          <Row label="Salt (16 octets, hex)" value={env.saltHex} />
          <Row label="IV / nonce (12 octets, hex)" value={env.ivHex} />
          <Row label="Itérations" value={`${env.iterations.toLocaleString('fr-FR')} (PBKDF2-SHA-256)${ms !== null ? ` · ${ms} ms` : ''}`} />
          <Row label="Texte chiffré + tag (base64)" value={env.ciphertextB64} />
          <Row label="Blob stocké : salt ‖ IV ‖ texte chiffré (base64)" value={env.packedB64} />
        </div>
      )}

      {env && (
        <div className="flex gap-2 items-end flex-wrap">
          <label className="block text-xs text-slate-400 flex-1 min-w-[12rem]">
            Phrase secrète (déchiffrement) — essayez-en une fausse
            <input
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
              value={decryptPass}
              onChange={(e) => setDecryptPass(clampLength(e.target.value, LIMITS.passphrase))}
              maxLength={LIMITS.passphrase}
            />
          </label>
          <button
            type="button"
            onClick={runDecrypt}
            disabled={busy}
            className="px-3 py-2 rounded-lg border border-slate-600 text-sm disabled:opacity-40"
          >
            Déchiffrer
          </button>
        </div>
      )}
      {recovered && (
        <div className="glass rounded-xl p-3 border border-emerald-500/30">
          <p className="text-xs text-slate-400">Texte retrouvé</p>
          <p className="text-emerald-200 mt-1">{recovered}</p>
        </div>
      )}
      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="glass rounded-xl p-4 text-sm text-slate-300 space-y-2">
        <p className="font-medium text-white">Symétrique ou asymétrique</p>
        <p>
          <strong className="text-cyan-300">Symétrique (AES) :</strong> un seul secret partagé — rapide pour de gros volumes.
        </p>
        <p>
          <strong className="text-violet-300">Asymétrique (RSA/ECC) :</strong> paire clé publique/clé privée — échange de clés et
          signatures. TLS combine les deux.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className="font-mono text-violet-200 break-all">{value}</p>
    </div>
  )
}
