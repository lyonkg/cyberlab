import { useState } from 'react'
import { useProgress } from '../../hooks/useProgress'

const STEPS = [
  { from: 'Client', to: 'Server', flag: 'SYN', desc: 'Le client choisit son ISN et demande la connexion' },
  { from: 'Server', to: 'Client', flag: 'SYN+ACK', desc: 'Le serveur accuse réception et envoie son ISN' },
  { from: 'Client', to: 'Server', flag: 'ACK', desc: 'Le client accuse réception — connexion établie' },
]

export function TcpHandshakeLab() {
  const [step, setStep] = useState(-1)
  const { completeLab } = useProgress()

  const next = () => {
    setStep((s) => {
      const n = Math.min(s + 1, STEPS.length - 1)
      if (n === STEPS.length - 1) completeLab('tcp-handshake')
      return n
    })
  }

  const reset = () => setStep(-1)

  return (
    <div className="space-y-4" data-testid="lab-tcp-handshake">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white">Handshake TCP en trois temps</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="px-3 py-1.5 rounded-lg border border-slate-600 text-sm"
          >
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={next}
            disabled={step >= STEPS.length - 1}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold disabled:opacity-40"
          >
            {step < 0 ? 'Démarrer' : 'Segment suivant'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-cyan-300">Client</p>
          <p className="text-xs text-slate-400 mt-1">ISN = 1000</p>
        </div>
        <div className="flex flex-col gap-2 min-w-[8rem] pt-2">
          {STEPS.map((s, i) => (
            <div
              key={s.flag}
              className={`text-center text-xs px-2 py-2 rounded-lg border transition ${
                step >= i
                  ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100'
                  : 'border-slate-800 text-slate-600'
              }`}
            >
              {s.from === 'Client' ? '→' : '←'} {s.flag}
            </div>
          ))}
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-violet-300">Serveur</p>
          <p className="text-xs text-slate-400 mt-1">ISN = 5000</p>
        </div>
      </div>

      {step >= 0 && (
        <p className="text-sm text-slate-300 glass rounded-xl p-3">
          <span className="text-cyan-300 font-mono">{STEPS[step].flag}:</span> {STEPS[step].desc}
        </p>
      )}
    </div>
  )
}
