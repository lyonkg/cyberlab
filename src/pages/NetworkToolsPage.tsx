import { useEffect, useState } from 'react'
import { getLabMode, getLabProvider, setLabMode, type LabMode } from '../labs/providers'
import { envLabApiBase } from '../labs/mode'
import { useProgress } from '../hooks/useProgress'

type Tool = 'ping' | 'traceroute' | 'dns' | 'headers' | 'port'

export function NetworkToolsPage() {
  const [mode, setMode] = useState<LabMode>(() => getLabMode())
  const [tool, setTool] = useState<Tool>('ping')
  const [host, setHost] = useState('example.com')
  const [url, setUrl] = useState('https://example.com')
  const [port, setPort] = useState(443)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<unknown>(null)
  const [health, setHealth] = useState<'unknown' | 'up' | 'down'>('unknown')
  const { completeLab } = useProgress()
  const provider = getLabProvider()

  useEffect(() => {
    const onMode = () => setMode(getLabMode())
    window.addEventListener('cyberlab-lab-mode', onMode)
    return () => window.removeEventListener('cyberlab-lab-mode', onMode)
  }, [])

  useEffect(() => {
    if (mode !== 'real') {
      setHealth('unknown')
      return
    }
    const base = envLabApiBase()
    fetch(`${base.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(3000) })
      .then((r) => setHealth(r.ok ? 'up' : 'down'))
      .catch(() => setHealth('down'))
  }, [mode])

  const switchMode = (m: LabMode) => {
    setLabMode(m)
    setMode(m)
    setResult(null)
    setError(null)
  }

  const run = async () => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const p = getLabProvider()
      let out: unknown
      if (tool === 'ping') out = await p.ping(host)
      else if (tool === 'traceroute') out = await p.traceroute(host)
      else if (tool === 'dns') out = await p.dnsLookup(host)
      else if (tool === 'headers') out = await p.inspectUrl(url)
      else out = await p.checkPort(host, port)
      setResult(out)
      completeLab('network-tools')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6" data-testid="lab-network-tools">
      <div>
        <h1 className="text-2xl font-bold text-white">Network Tools Lab</h1>
        <p className="text-slate-400 mt-2 text-sm max-w-2xl">
          Ping, traceroute, DNS, HTTP header/TLS inspection, and single-port checks. In{' '}
          <strong className="text-slate-200">simulated</strong> mode everything stays in the browser. In{' '}
          <strong className="text-slate-200">real</strong> mode the UI calls the local lab API (
          <code className="text-cyan-300">npm run server</code> → {envLabApiBase()}).
        </p>
      </div>

      <div className="glass rounded-xl p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-wider text-slate-500">Lab mode</span>
        {(['simulated', 'real'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
              mode === m ? 'bg-cyan-500/30 text-cyan-100' : 'border border-slate-700 text-slate-400'
            }`}
          >
            {m}
          </button>
        ))}
        <span className="text-xs text-slate-500">
          provider: {provider.name}
          {mode === 'real' && (
            <>
              {' '}
              · API{' '}
              <span className={health === 'up' ? 'text-emerald-300' : health === 'down' ? 'text-rose-300' : ''}>
                {health === 'up' ? 'reachable' : health === 'down' ? 'unreachable — start npm run server' : '…'}
              </span>
            </>
          )}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['ping', 'traceroute', 'dns', 'headers', 'port'] as Tool[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTool(t)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
              tool === t ? 'bg-violet-500/30 text-violet-100' : 'border border-slate-700 text-slate-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="glass rounded-xl p-4 space-y-3 max-w-xl">
        {tool !== 'headers' ? (
          <label className="block text-xs text-slate-400">
            Host
            <input
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
          </label>
        ) : (
          <label className="block text-xs text-slate-400">
            URL
            <input
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
        )}
        {tool === 'port' && (
          <label className="block text-xs text-slate-400">
            Port
            <input
              type="number"
              min={1}
              max={65535}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
            />
          </label>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={run}
          className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold disabled:opacity-40"
        >
          {busy ? 'Running…' : 'Run'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl p-3 border border-amber-500/40 bg-amber-500/10 text-amber-100 text-sm">
          {error}
          {mode === 'real' && (
            <p className="text-xs mt-2 text-amber-200/80">
              Tip: switch back to simulated mode, or start the API with <code>npm run server</code>.
            </p>
          )}
        </div>
      )}
      {result !== null && (
        <pre className="glass rounded-xl p-4 text-xs font-mono text-slate-200 overflow-x-auto scrollbar-thin">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
