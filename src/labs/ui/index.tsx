import { lazy, Suspense, useRef, type ComponentType, type LazyExoticComponent } from 'react'
import { FullscreenButton } from '../../components/FullscreenButton'

export { LAB_TITLES } from '../titles'

// Each lab is its own chunk, loaded only when opened (Recharts only ships with the DDoS lab).
const named = <K extends string>(loader: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => loader().then((m) => ({ default: m[name] })))

const LAB_MAP: Record<string, LazyExoticComponent<ComponentType>> = {
  topology: named(() => import('./TopologyLab'), 'TopologyLab'),
  firewall: named(() => import('./FirewallLab'), 'FirewallLab'),
  'packet-flow': named(() => import('./PacketFlowLab'), 'PacketFlowLab'),
  'tcp-handshake': named(() => import('./TcpHandshakeLab'), 'TcpHandshakeLab'),
  caesar: named(() => import('./CipherPlayground'), 'CipherPlayground'),
  aes: named(() => import('./AesDemo'), 'AesDemo'),
  hashing: named(() => import('./HashingDemo'), 'HashingDemo'),
  'spot-phish': named(() => import('./PhishingLab'), 'PhishingLab'),
  'malware-spread': named(() => import('./MalwareLab'), 'MalwareLab'),
  'ddos-sim': named(() => import('./DDoSLab'), 'DDoSLab'),
  'mitm-anim': named(() => import('./MitmLab'), 'MitmLab'),
  'sqli-login': named(() => import('./SqliLab'), 'SqliLab'),
  'sqli-union': named(() => import('./UnionLab'), 'UnionLab'),
  'sqli-join': named(() => import('./JoinLab'), 'JoinLab'),
  'sqli-blind': named(() => import('./BlindLab'), 'BlindLab'),
  password: named(() => import('./PasswordLab'), 'PasswordLab'),
  'defense-depth': named(() => import('./DefenseDepthLab'), 'DefenseDepthLab'),
}

export function LabRenderer({ labId }: { labId: string }) {
  const Comp = LAB_MAP[labId]
  const frame = useRef<HTMLDivElement>(null)
  if (!Comp) return <p className="text-sm text-rose-300">Lab inconnu.</p>
  return (
    <div ref={frame} className="lab-frame glass rounded-2xl p-5 relative">
      <div className="flex justify-end -mt-2 -mr-2 mb-1">
        <FullscreenButton target={frame} testId="lab-fullscreen-toggle" showLabel />
      </div>
      <Suspense fallback={<p className="text-sm text-slate-400">Chargement du lab…</p>}>
        <Comp />
      </Suspense>
    </div>
  )
}
