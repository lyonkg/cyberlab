import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useProgress } from '../../hooks/useProgress'

interface Point {
  t: number
  rps: number
  served: number
}

export function DDoSLab() {
  const [attack, setAttack] = useState(false)
  const [rateLimit, setRateLimit] = useState(false)
  const [cdn, setCdn] = useState(false)
  const [data, setData] = useState<Point[]>([])
  const { completeLab } = useProgress()
  const capacity = 1000

  useEffect(() => {
    const id = window.setInterval(() => {
      setData((prev) => {
        const t = (prev.at(-1)?.t ?? 0) + 1
        let inbound = 200 + Math.random() * 100
        if (attack) inbound += 4000 + Math.random() * 2000
        if (cdn && attack) inbound *= 0.25
        let served = inbound
        if (rateLimit) served = Math.min(served, 800)
        served = Math.min(served, capacity * (cdn ? 4 : 1))
        const next = [...prev, { t, rps: Math.round(inbound), served: Math.round(served) }]
        return next.slice(-40)
      })
    }, 400)
    return () => clearInterval(id)
  }, [attack, rateLimit, cdn])

  const healthy = useMemo(() => {
    const last = data.at(-1)
    if (!last) return true
    return last.served >= last.rps * 0.85 || last.rps < capacity
  }, [data, capacity])

  useEffect(() => {
    if (attack && (rateLimit || cdn)) completeLab('ddos-sim')
  }, [attack, rateLimit, cdn]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4" data-testid="lab-ddos">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white">Simulateur de trafic DDoS</h3>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            healthy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
          }`}
        >
          {healthy ? 'Service OK' : 'Dégradé / surchargé'}
        </span>
      </div>

      <div className="h-56 glass rounded-xl p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid stroke="#1e293b" />
            <XAxis dataKey="t" stroke="#64748b" tick={{ fontSize: 10 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
            <Tooltip
              labelFormatter={(t) => `Seconde ${t}`}
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
            />
            <Area type="monotone" dataKey="rps" name="Requêtes/s entrantes" stroke="#f97316" fill="#f9731633" />
            <Area type="monotone" dataKey="served" name="Requêtes/s servies" stroke="#22d3ee" fill="#22d3ee33" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-2">
        <Toggle label="Trafic d’attaque" on={attack} onChange={setAttack} danger />
        <Toggle label="Limitation de débit" on={rateLimit} onChange={setRateLimit} />
        <Toggle label="Absorption CDN / anycast" on={cdn} onChange={setCdn} />
      </div>
      <p className="text-xs text-slate-400">
        Lancez une attaque, puis activez les contre-mesures. Orange = flot entrant ; cyan = ce que le serveur d’origine peut servir.
      </p>
    </div>
  )
}

function Toggle({
  label,
  on,
  onChange,
  danger,
}: {
  label: string
  on: boolean
  onChange: (v: boolean) => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
        on
          ? danger
            ? 'bg-orange-500/30 border-orange-400 text-orange-100'
            : 'bg-cyan-500/30 border-cyan-400 text-cyan-100'
          : 'border-slate-600 text-slate-400'
      }`}
    >
      {label} : {on ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
    </button>
  )
}
