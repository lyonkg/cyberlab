import { useState } from 'react'
import { decryptAesGcm, encryptAesGcm, PBKDF2_ITERATIONS, type AesEnvelope } from '../../lib/aes'
import { useProgress } from '../../hooks/useProgress'
import { LIMITS, clampLength } from '../../lib/validation'

export function AesDemo() {
  const [plain, setPlain] = useState('Top secret payload')
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
      setError('Decrypt failed — wrong passphrase or tampered ciphertext (AES-GCM authentication tag mismatch).')
      setRecovered('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4" data-testid="lab-aes">
      <h3 className="font-semibold text-white">AES-256-GCM with PBKDF2 (Web Crypto)</h3>
      <p className="text-sm text-slate-400">
        Your passphrase is stretched into a 256-bit key with PBKDF2-HMAC-SHA-256 ({PBKDF2_ITERATIONS.toLocaleString()}{' '}
        iterations) and a random 16-byte salt. Each encryption also uses a fresh random 12-byte IV (nonce). Salt and
        IV are not secret — they are stored next to the ciphertext.
      </p>
      <label className="block text-xs text-slate-400">
        Plaintext
        <input
          className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          value={plain}
          onChange={(e) => setPlain(clampLength(e.target.value, LIMITS.aesPlain))}
          maxLength={LIMITS.aesPlain}
        />
      </label>
      <label className="block text-xs text-slate-400">
        Passphrase (encrypt)
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
        {busy ? 'Working…' : 'Encrypt'}
      </button>

      {env && (
        <div className="glass rounded-xl p-3 space-y-2 text-xs">
          <Row label="Salt (16 B, hex)" value={env.saltHex} />
          <Row label="IV / nonce (12 B, hex)" value={env.ivHex} />
          <Row label="Iterations" value={`${env.iterations.toLocaleString()} (PBKDF2-SHA-256)${ms !== null ? ` · ${ms} ms` : ''}`} />
          <Row label="Ciphertext + tag (base64)" value={env.ciphertextB64} />
          <Row label="Stored blob: salt ‖ IV ‖ ciphertext (base64)" value={env.packedB64} />
        </div>
      )}

      {env && (
        <div className="flex gap-2 items-end flex-wrap">
          <label className="block text-xs text-slate-400 flex-1 min-w-[12rem]">
            Passphrase (decrypt) — try a wrong one
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
            Decrypt
          </button>
        </div>
      )}
      {recovered && (
        <div className="glass rounded-xl p-3 border border-emerald-500/30">
          <p className="text-xs text-slate-400">Recovered</p>
          <p className="text-emerald-200 mt-1">{recovered}</p>
        </div>
      )}
      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="glass rounded-xl p-4 text-sm text-slate-300 space-y-2">
        <p className="font-medium text-white">Symmetric vs Asymmetric</p>
        <p>
          <strong className="text-cyan-300">Symmetric (AES):</strong> one shared secret — fast for bulk data.
        </p>
        <p>
          <strong className="text-violet-300">Asymmetric (RSA/ECC):</strong> public/private pair — key exchange &
          signatures. TLS combines both.
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
