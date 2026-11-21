import { useMemo, useState } from 'react'
import { createDefaultRules, evaluatePacket } from '../../lib/firewall'
import type { FirewallRule, Packet } from '../../types'
import { useProgress } from '../../hooks/useProgress'
import { LIMITS, clampLength, parsePacketPort, parsePortInput } from '../../lib/validation'

export function FirewallLab() {
  const [rules, setRules] = useState<FirewallRule[]>(() => createDefaultRules())
  const [packet, setPacket] = useState<Packet>({
    id: 'p1',
    protocol: 'tcp',
    srcIp: '203.0.113.50',
    dstIp: '10.0.0.10',
    dstPort: 443,
    direction: 'inbound',
  })
  const [portDrafts, setPortDrafts] = useState<Record<string, string>>({})
  const [packetPortDraft, setPacketPortDraft] = useState<string | null>(null)
  const decision = useMemo(() => evaluatePacket(rules, packet), [rules, packet])
  const { completeLab } = useProgress()

  const updateRule = (id: string, patch: Partial<FirewallRule>) => {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  return (
    <div className="space-y-4" data-testid="lab-firewall">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-white">Lab des règles de pare-feu</h3>
        <button
          type="button"
          className="text-xs px-2 py-1 rounded border border-slate-600 hover:bg-slate-800"
          onClick={() => {
            completeLab('firewall')
          }}
        >
          Marquer le lab comme terminé
        </button>
      </div>
      <p className="text-sm text-slate-400">
        Évaluation « première correspondance ». Modifiez les règles, forgez un paquet et voyez la décision autoriser/refuser en direct.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-900/80 text-slate-400">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Action</th>
              <th className="p-2">Proto</th>
              <th className="p-2">Source</th>
              <th className="p-2">Destination</th>
              <th className="p-2">Port</th>
              <th className="p-2">Sens</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="p-2 font-mono text-cyan-300">{r.id}</td>
                <td className="p-2">
                  <select
                    className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5"
                    value={r.action}
                    onChange={(e) =>
                      updateRule(r.id, { action: e.target.value as 'allow' | 'deny' })
                    }
                  >
                    <option value="allow">autoriser</option>
                    <option value="deny">refuser</option>
                  </select>
                </td>
                <td className="p-2">
                  <select
                    className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5"
                    value={r.protocol}
                    onChange={(e) =>
                      updateRule(r.id, {
                        protocol: e.target.value as FirewallRule['protocol'],
                      })
                    }
                  >
                    {['tcp', 'udp', 'icmp', 'any'].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    className="w-28 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 font-mono"
                    value={r.srcIp}
                    onChange={(e) => {
                      const v = clampLength(e.target.value, LIMITS.ip)
                      updateRule(r.id, { srcIp: v })
                    }}
                    maxLength={LIMITS.ip}
                    spellCheck={false}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-28 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 font-mono"
                    value={r.dstIp}
                    onChange={(e) => {
                      const v = clampLength(e.target.value, LIMITS.ip)
                      updateRule(r.id, { dstIp: v })
                    }}
                    maxLength={LIMITS.ip}
                    spellCheck={false}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 font-mono"
                    value={portDrafts[r.id] ?? (r.dstPort === 'any' ? 'any' : String(r.dstPort))}
                    onChange={(e) => {
                      const v = clampLength(e.target.value, 5)
                      setPortDrafts((d) => ({ ...d, [r.id]: v }))
                      const parsed = parsePortInput(v)
                      if (parsed !== null) updateRule(r.id, { dstPort: parsed })
                    }}
                    maxLength={5}
                    spellCheck={false}
                  />
                </td>
                <td className="p-2">
                  <select
                    className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5"
                    value={r.direction}
                    onChange={(e) =>
                      updateRule(r.id, {
                        direction: e.target.value as FirewallRule['direction'],
                      })
                    }
                  >
                    {['inbound', 'outbound', 'any'].map((d) => (
                      <option key={d} value={d}>
                        {d === 'inbound' ? 'entrant' : d === 'outbound' ? 'sortant' : 'tous'}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="glass rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-slate-200">Forger un paquet</p>
          {(
            [
              ['srcIp', 'IP source'],
              ['dstIp', 'IP destination'],
              ['dstPort', 'Port destination'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-xs text-slate-400">
              {label}
              <input
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 font-mono text-sm text-slate-100"
                value={key === 'dstPort' ? (packetPortDraft ?? String(packet.dstPort)) : packet[key]}
                onChange={(e) => {
                  if (key === 'dstPort') {
                    const v = clampLength(e.target.value, 5)
                    setPacketPortDraft(v)
                    const parsed = parsePacketPort(v)
                    if (parsed !== null) setPacket((p) => ({ ...p, dstPort: parsed }))
                    return
                  }
                  setPacket((p) => ({ ...p, [key]: clampLength(e.target.value, LIMITS.ip) }))
                }}
                maxLength={key === 'dstPort' ? 5 : LIMITS.ip}
                spellCheck={false}
              />
            </label>
          ))}
          <label className="block text-xs text-slate-400">
            Protocole
            <select
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm"
              value={packet.protocol}
              onChange={(e) =>
                setPacket((p) => ({
                  ...p,
                  protocol: e.target.value as Packet['protocol'],
                }))
              }
            >
              <option value="tcp">tcp</option>
              <option value="udp">udp</option>
              <option value="icmp">icmp</option>
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Sens
            <select
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm"
              value={packet.direction}
              onChange={(e) =>
                setPacket((p) => ({
                  ...p,
                  direction: e.target.value as Packet['direction'],
                }))
              }
            >
              <option value="inbound">entrant</option>
              <option value="outbound">sortant</option>
            </select>
          </label>
        </div>

        <div
          className={`rounded-xl p-4 border ${
            decision.allowed
              ? 'bg-emerald-500/10 border-emerald-500/40'
              : 'bg-rose-500/10 border-rose-500/40'
          }`}
        >
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Décision</p>
          <p className="text-2xl font-bold">
            {decision.allowed ? 'AUTORISÉ' : 'REFUSÉ'}
          </p>
          <p className="mt-2 text-sm text-slate-300 font-mono">{decision.reason}</p>
        </div>
      </div>
    </div>
  )
}
