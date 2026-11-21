import { isAllowedLabApiBase, resolveLabApiUrl } from '../../../lib/validation'
import { envLabApiBase } from '../../mode'
import type {
  CryptoHashResult,
  DnsResult,
  HeadersResult,
  LabProvider,
  NetworkScanResult,
  PacketCaptureResult,
  PingResult,
  PortCheckResult,
  TracerouteResult,
} from '../types'

function apiBase(): string {
  return envLabApiBase()
}

async function apiGet<T>(path: string, query: Record<string, string | number>): Promise<T> {
  const base = apiBase()
  if (!isAllowedLabApiBase(base)) {
    throw new Error(
      'Adresse de l’API de lab non autorisée. Utilisez http://127.0.0.1:8787 (ou localhost) ou une URL https://.',
    )
  }
  const url = resolveLabApiUrl(path, base)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v))
  let res: Response
  try {
    res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(15_000) })
  } catch (e) {
    throw new Error(
      `API de lab injoignable à ${base} (${e instanceof Error ? e.message : String(e)}). Démarrez-la avec : npm run server`,
    )
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : `API de lab : erreur HTTP ${res.status}`)
  }
  return body as T
}

export const realProvider: LabProvider = {
  mode: 'real',
  name: 'fournisseur de labs réel (API locale)',
  description:
    'Appelle l’API de lab locale de CyberLab (npm run server) pour ping, traceroute, DNS, en-têtes HTTP/TLS et tests de port. Affiche une erreur claire si le serveur est arrêté.',
  async capturePackets(): Promise<PacketCaptureResult> {
    // Still simulated — real pcap needs privileges we do not grant the teaching API.
    const now = Date.now()
    return {
      source: 'real',
      packets: [
        {
          timestamp: now,
          summary: 'Mode réel : la capture de paquets n’est pas exposée par l’API locale (nécessite root/pcap).',
          raw: 'N/A',
        },
      ],
    }
  },
  async hashPassword(password, salt, algorithm = 'SHA-256'): Promise<CryptoHashResult> {
    // Web Crypto is already "real" cryptography — reuse it.
    const data = new TextEncoder().encode(`${salt}:${password}`)
    const hash = await crypto.subtle.digest('SHA-256', data)
    const digestHex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
    return { algorithm, digestHex, source: 'real' }
  },
  async scanHost(host): Promise<NetworkScanResult> {
    // Single-port checks only — no full port scan from the teaching API.
    const common = [22, 80, 443]
    const openPorts: number[] = []
    for (const port of common) {
      try {
        const r = await apiGet<PortCheckResult>('port', { host, port })
        if (r.ok) openPorts.push(port)
      } catch {
        /* skip */
      }
    }
    return { host, openPorts, source: 'real' }
  },
  async ping(host): Promise<PingResult> {
    const r = await apiGet<Omit<PingResult, 'source'>>('ping', { host })
    return { ...r, source: 'real' }
  },
  async traceroute(host): Promise<TracerouteResult> {
    const r = await apiGet<Omit<TracerouteResult, 'source'>>('traceroute', { host })
    return { ...r, source: 'real' }
  },
  async dnsLookup(host): Promise<DnsResult> {
    const r = await apiGet<Omit<DnsResult, 'source'>>('dns', { host })
    return { ...r, source: 'real' }
  },
  async inspectUrl(url): Promise<HeadersResult> {
    const r = await apiGet<Omit<HeadersResult, 'source'>>('headers', { url })
    return { ...r, source: 'real' }
  },
  async checkPort(host, port): Promise<PortCheckResult> {
    const r = await apiGet<Omit<PortCheckResult, 'source'>>('port', { host, port })
    return { ...r, source: 'real' }
  },
}
