import { useEffect, useState } from 'react'
import { useProgress } from '../../hooks/useProgress'

type Hop = 'client' | 'router' | 'firewall' | 'server'
const HOPS: Hop[] = ['client', 'router', 'firewall', 'server']
const LABELS: Record<Hop, string> = {
  client: 'Client',
  router: 'Router',
  firewall: 'Firewall',
  server: 'Server',
}

export function PacketFlowLab() {
  const [hop, setHop] = useState(0)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const { completeLab } = useProgress()

  useEffect(() => {
    if (!running) return
    if (hop >= HOPS.length - 1) {
      setRunning(false)
      setLog((l) => [...l, '✓ Packet delivered to server (HTTPS :443)'])
      completeLab('packet-flow')
      return
    }
    const t = setTimeout(() => {
      const from = HOPS[hop]
      const to = HOPS[hop + 1]
      setLog((l) => [...l, `→ Forward ${from} → ${to}`])
      setHop((h) => h + 1)
    }, 700)
    return () => clearTimeout(t)
  }, [running, hop]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    setHop(0)
    setLog(['◆ Client sends HTTPS request'])
    setRunning(true)
  }

  return (
    <div className="space-y-4" data-testid="lab-packet-flow">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white">Packet Flow Animation</h3>
        <button
          type="button"
          onClick={start}
          disabled={running}
          className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold disabled:opacity-40"
        >
          {running ? 'Animating…' : 'Send packet'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 overflow-x-auto py-4">
        {HOPS.map((h, i) => (
          <div key={h} className="flex items-center gap-2 flex-1 min-w-[4.5rem]">
            <div
              className={`flex flex-col items-center gap-1 transition ${
                hop === i ? 'scale-110' : 'opacity-70'
              }`}
            >
              <div
                className={`h-14 w-14 rounded-xl border-2 flex items-center justify-center text-xs font-bold ${
                  hop === i
                    ? 'border-cyan-400 bg-cyan-400/20 text-cyan-200 animate-pulse-glow'
                    : hop > i
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                      : 'border-slate-600 bg-slate-900 text-slate-400'
                }`}
              >
                {LABELS[h]}
              </div>
            </div>
            {i < HOPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 rounded ${
                  hop > i ? 'bg-cyan-400' : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-3 font-mono text-xs text-slate-300 space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
        {log.length === 0 ? (
          <p className="text-slate-500">Press “Send packet” to animate Client → Router → Firewall → Server.</p>
        ) : (
          log.map((line, i) => <div key={i}>{line}</div>)
        )}
      </div>
    </div>
  )
}
