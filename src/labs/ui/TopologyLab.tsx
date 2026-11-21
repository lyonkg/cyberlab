import { useProgress } from '../../hooks/useProgress'
import { useEffect } from 'react'

const NODES = [
  { id: 'inet', x: 50, y: 20, label: 'Internet', color: '#64748b' },
  { id: 'fw', x: 50, y: 45, label: 'Firewall', color: '#f43f5e' },
  { id: 'router', x: 50, y: 65, label: 'Router', color: '#22d3ee' },
  { id: 'web', x: 25, y: 88, label: 'Web :443', color: '#34d399' },
  { id: 'db', x: 50, y: 88, label: 'DB :5432', color: '#a78bfa' },
  { id: 'admin', x: 75, y: 88, label: 'Admin', color: '#fbbf24' },
]

const EDGES: [string, string][] = [
  ['inet', 'fw'],
  ['fw', 'router'],
  ['router', 'web'],
  ['router', 'db'],
  ['router', 'admin'],
]

export function TopologyLab() {
  const { completeLab } = useProgress()
  useEffect(() => {
    completeLab('topology')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pos = Object.fromEntries(NODES.map((n) => [n.id, n]))

  return (
    <div className="space-y-3" data-testid="lab-topology">
      <h3 className="font-semibold text-white">Interactive Network Topology</h3>
      <p className="text-sm text-slate-400">
        Segmented LAN behind a firewall. Only published services should be reachable from the Internet.
      </p>
      <svg viewBox="0 0 100 100" className="w-full max-h-80 rounded-xl bg-slate-950/60 border border-slate-700">
        {EDGES.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={pos[a].x}
            y1={pos[a].y}
            x2={pos[b].x}
            y2={pos[b].y}
            stroke="#334155"
            strokeWidth="0.6"
          />
        ))}
        {NODES.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r="5" fill={n.color} opacity="0.9" />
            <text
              x={n.x}
              y={n.y + 9}
              textAnchor="middle"
              fill="#cbd5e1"
              fontSize="3.5"
              fontFamily="system-ui"
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
