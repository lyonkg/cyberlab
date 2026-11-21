import { useState } from 'react'
import { useProgress } from '../../hooks/useProgress'
import { PercentBar } from '../../components/PercentBar'

const LAYERS = [
  {
    id: 'edge',
    title: 'Périmètre / réseau',
    items: ['Pare-feu + WAF', 'Protection DDoS', 'TLS partout', 'Segmentation réseau'],
  },
  {
    id: 'identity',
    title: 'Identité',
    items: ['SSO + MFA', 'RBAC au moindre privilège', 'Coffre-fort d’identifiants', 'Accès juste-à-temps'],
  },
  {
    id: 'host',
    title: 'Hôte / application',
    items: ['Gestion des correctifs', 'EDR / antivirus', 'Cycle de développement sécurisé', 'Requêtes paramétrées'],
  },
  {
    id: 'data',
    title: 'Données',
    items: ['Chiffrement au repos', 'Sauvegardes + tests de restauration', 'Politiques DLP', 'Rotation des clés'],
  },
  {
    id: 'detect',
    title: 'Détection et réponse',
    items: ['Journalisation centralisée', 'Alertes / SIEM', 'Procédures de réponse aux incidents', 'Exercices de simulation'],
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
        <h3 className="font-semibold text-white">Check-list de défense en profondeur</h3>
        <span className="text-xs text-cyan-300">
          {score}/{total} contrôles activés
        </span>
      </div>
      <p className="text-sm text-slate-400">
        Activez des contrôles sur les différentes couches. Une vraie sécurité empile des défenses qui se recouvrent — il n’existe pas de solution miracle.
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
