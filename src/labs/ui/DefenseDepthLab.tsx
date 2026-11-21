import { useState } from 'react'
import { useProgress } from '../../hooks/useProgress'
import { PercentBar } from '../../components/PercentBar'

const LAYERS = [
  {
    id: 'edge',
    title: 'Edge / Network',
    items: ['Firewall + WAF', 'DDoS protection', 'TLS everywhere', 'Network segmentation'],
  },
  {
    id: 'identity',
    title: 'Identity',
    items: ['SSO + MFA', 'Least privilege RBAC', 'Credential vaulting', 'Just-in-time access'],
  },
  {
    id: 'host',
    title: 'Host / App',
    items: ['Patch management', 'EDR / antivirus', 'Secure SDLC', 'Parameterized queries'],
  },
  {
    id: 'data',
    title: 'Data',
    items: ['Encryption at rest', 'Backups + restore tests', 'DLP policies', 'Key rotation'],
  },
  {
    id: 'detect',
    title: 'Detect & Respond',
    items: ['Central logging', 'Alerting / SIEM', 'Incident playbooks', 'Tabletop exercises'],
  },
]

export function DefenseDepthLab() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const { completeLab } = useProgress()
  const score = Object.values(enabled).filter(Boolean).length
  const total = LAYERS.reduce((n, l) => n + l.items.length, 0)

  const toggle = (key: string) => {
    setEnabled((e) => {
      const next = { ...e, [key]: !e[key] }
      const count = Object.values(next).filter(Boolean).length
      if (count >= 6) completeLab('defense-depth')
      return next
    })
  }

  return (
    <div className="space-y-4" data-testid="lab-defense-depth">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white">Defense in Depth Checklist</h3>
        <span className="text-xs text-cyan-300">
          {score}/{total} controls enabled
        </span>
      </div>
      <p className="text-sm text-slate-400">
        Toggle controls across layers. Real security stacks overlapping defenses — no single silver bullet.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {LAYERS.map((layer) => (
          <div key={layer.id} className="glass rounded-xl p-4">
            <p className="text-sm font-semibold text-sky-300 mb-2">{layer.title}</p>
            <ul className="space-y-1.5">
              {layer.items.map((item) => {
                const key = `${layer.id}:${item}`
                return (
                  <li key={key}>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!enabled[key]}
                        onChange={() => toggle(key)}
                      />
                      {item}
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      <PercentBar value={total ? (score / total) * 100 : 0} heightClass="h-2" />
    </div>
  )
}
