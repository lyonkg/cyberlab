import { useEffect, useState } from 'react'
import { useProgress } from '../../hooks/useProgress'

type Mode = 'http' | 'https'

const FRAMES_HTTP = [
  { actor: 'Alice', text: 'GET /login  password=s3cret', mallory: 'Je peux lire ça !' },
  { actor: 'Mallory', text: 'Retransmission… (et pourquoi pas password=evil)', mallory: 'Modification en cours…' },
  { actor: 'Bob', text: '200 OK Set-Cookie: session=abc', mallory: 'Cookie de session volé' },
]

const FRAMES_HTTPS = [
  { actor: 'Alice', text: 'TLS ClientHello + vérification du certificat', mallory: 'Chiffré — illisible' },
  { actor: 'Bob', text: 'Certificate + Finished', mallory: 'L’usurpation échoue sans certificat valide' },
  { actor: 'Alice', text: 'Encrypted Application Data (données chiffrées)', mallory: 'Ne voit que du texte chiffré' },
]

export function MitmLab() {
  const [mode, setMode] = useState<Mode>('http')
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)
  const { completeLab } = useProgress()
  const frames = mode === 'http' ? FRAMES_HTTP : FRAMES_HTTPS

  useEffect(() => {
    if (!playing) return
    if (frame >= frames.length - 1) {
      setPlaying(false)
      completeLab('mitm-anim')
      return
    }
    const t = setTimeout(() => setFrame((f) => f + 1), 1200)
    return () => clearTimeout(t)
  }, [playing, frame, frames.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    setFrame(0)
    setPlaying(true)
  }

  const current = frames[frame]

  return (
    <div className="space-y-4" data-testid="lab-mitm">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white">MITM: Alice · Mallory · Bob</h3>
        <div className="flex gap-2">
          {(['http', 'https'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setFrame(0)
                setPlaying(false)
              }}
              className={`px-3 py-1 rounded-lg text-sm uppercase ${
                mode === m ? 'bg-fuchsia-500/30 text-fuchsia-200' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {m}
            </button>
          ))}
          <button
            type="button"
            onClick={start}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold"
          >
            Lecture
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {['Alice', 'Mallory', 'Bob'].map((name) => (
          <div
            key={name}
            className={`glass rounded-xl p-4 ${
              current?.actor === name || (name === 'Mallory' && playing)
                ? 'ring-2 ring-fuchsia-400/50'
                : ''
            }`}
          >
            <p
              className={`font-semibold ${
                name === 'Mallory' ? 'text-rose-300' : name === 'Alice' ? 'text-cyan-300' : 'text-violet-300'
              }`}
            >
              {name}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              {name === 'Mallory' ? 'attaquante' : name === 'Alice' ? 'cliente' : 'serveur'}
            </p>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-4 space-y-2 min-h-[5rem]">
        <p className="text-sm font-mono text-slate-200">
          <span className="text-fuchsia-300">{current?.actor}:</span> {current?.text}
        </p>
        <p className="text-xs text-rose-300/90">Mallory: {current?.mallory}</p>
      </div>

      <p className="text-xs text-slate-400">
        {mode === 'http'
          ? 'HTTP circule en clair — Mallory peut tout lire et tout modifier sur le trajet.'
          : 'HTTPS authentifie Bob grâce aux certificats et chiffre le canal — Mallory ne voit que du texte chiffré.'}
      </p>
    </div>
  )
}
