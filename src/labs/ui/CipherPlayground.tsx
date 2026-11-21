import { useMemo, useState } from 'react'
import {
  caesarDecrypt,
  caesarEncrypt,
  crackCaesar,
  vigenereDecrypt,
  vigenereEncrypt,
} from '../../lib/ciphers'
import { useProgress } from '../../hooks/useProgress'
import { LIMITS, clampLength } from '../../lib/validation'

export function CipherPlayground() {
  const [mode, setMode] = useState<'caesar' | 'vigenere'>('caesar')
  const [text, setText] = useState('Rendez-vous ce soir a minuit')
  const [shift, setShift] = useState(3)
  const [key, setKey] = useState('LEMON')
  const [direction, setDirection] = useState<'enc' | 'dec'>('enc')
  const { completeLab } = useProgress()

  const output = useMemo(() => {
    if (mode === 'caesar') {
      return direction === 'enc' ? caesarEncrypt(text, shift) : caesarDecrypt(text, shift)
    }
    return direction === 'enc' ? vigenereEncrypt(text, key) : vigenereDecrypt(text, key)
  }, [mode, text, shift, key, direction])

  const cracks = useMemo(
    () => (mode === 'caesar' && direction === 'dec' ? crackCaesar(text).slice(0, 5) : []),
    [mode, direction, text],
  )

  return (
    <div className="space-y-4" data-testid="lab-caesar">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white">Atelier des chiffrements classiques</h3>
        <button
          type="button"
          className="text-xs px-2 py-1 rounded border border-slate-600"
          onClick={() => completeLab('caesar')}
        >
          Marquer le lab comme terminé
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['caesar', 'vigenere'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 py-1 rounded-lg text-sm capitalize ${
              mode === m ? 'bg-violet-500/30 text-violet-200' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {m === 'caesar' ? 'César' : 'Vigenère'}
          </button>
        ))}
        {(['enc', 'dec'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={`px-3 py-1 rounded-lg text-sm ${
              direction === d ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {d === 'enc' ? 'Chiffrer' : 'Déchiffrer'}
          </button>
        ))}
      </div>

      <label className="block text-xs text-slate-400">
        Texte d’entrée
        <textarea
          className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-100 min-h-[4rem]"
          value={text}
          onChange={(e) => setText(clampLength(e.target.value, LIMITS.cipherText))}
          maxLength={LIMITS.cipherText}
        />
      </label>

      {mode === 'caesar' ? (
        <label className="block text-xs text-slate-400">
          Décalage : {shift}
          <input
            type="range"
            min={0}
            max={25}
            value={shift}
            onChange={(e) => setShift(parseInt(e.target.value, 10))}
            className="w-full mt-1"
          />
        </label>
      ) : (
        <label className="block text-xs text-slate-400">
          Clé
          <input
            className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm"
            value={key}
            onChange={(e) => setKey(clampLength(e.target.value, LIMITS.cipherKey))}
            maxLength={LIMITS.cipherKey}
          />
        </label>
      )}

      <div className="glass rounded-xl p-4">
        <p className="text-xs text-slate-400 mb-1">Résultat</p>
        <p className="font-mono text-cyan-200 break-all">{output || '—'}</p>
      </div>

      {cracks.length > 0 && (
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-2">Suggestions de cassage automatique (score de fréquence des lettres)</p>
          <ul className="space-y-1 text-sm font-mono">
            {cracks.map((c) => (
              <li key={c.shift} className="text-slate-300">
                <span className="text-violet-300">décalage {c.shift}</span>: {c.plaintext}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
