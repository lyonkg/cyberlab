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

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const simulatedProvider: LabProvider = {
  mode: 'simulated',
  name: 'fournisseur de labs simulé',
  description:
    'Tous les labs tournent entièrement dans le navigateur : aucune clé d’API, aucun privilège de capture réseau, aucune vraie cible.',
  async capturePackets(): Promise<PacketCaptureResult> {
    const now = Date.now()
    return {
      source: 'simulated',
      packets: [
        { timestamp: now, summary: 'TCP 192.168.1.10:52341 → 10.0.0.10:443 [SYN]', raw: 'SIM SYN' },
        {
          timestamp: now + 12,
          summary: 'TCP 10.0.0.10:443 → 192.168.1.10:52341 [SYN, ACK]',
          raw: 'SIM SYNACK',
        },
        {
          timestamp: now + 25,
          summary: 'TCP 192.168.1.10:52341 → 10.0.0.10:443 [ACK]',
          raw: 'SIM ACK',
        },
        {
          timestamp: now + 40,
          summary: 'TLS ClientHello (SNI=cyberlab.local)',
          raw: 'SIM TLS',
        },
      ],
    }
  },
  async hashPassword(password, salt, algorithm = 'SHA-256'): Promise<CryptoHashResult> {
    const digestHex = await sha256Hex(`${salt}:${password}`)
    return { algorithm, digestHex, source: 'simulated' }
  },
  async scanHost(host): Promise<NetworkScanResult> {
    const seed = [...host].reduce((a, c) => a + c.charCodeAt(0), 0)
    const candidates = [22, 80, 443, 3306, 8080, 5432]
    const openPorts = candidates.filter((_, i) => (seed + i) % 3 !== 0)
    return { host, openPorts, source: 'simulated' }
  },
  async ping(host): Promise<PingResult> {
    return {
      host,
      ok: true,
      method: 'simulated-icmp',
      summary: `PING ${host}: 3 packets transmitted, 3 received, 0% loss (simulé)\nrtt min/avg/max = 12.1/14.8/18.2 ms`,
      raw: 'SIM',
      source: 'simulated',
    }
  },
  async traceroute(host): Promise<TracerouteResult> {
    return {
      host,
      ok: true,
      method: 'simulated-traceroute',
      hops: ` 1  10.0.0.1  1.2 ms\n 2  100.64.0.1  8.4 ms\n 3  ${host}  14.8 ms`,
      source: 'simulated',
    }
  },
  async dnsLookup(host): Promise<DnsResult> {
    const seed = [...host].reduce((a, c) => a + c.charCodeAt(0), 0) % 200
    return {
      host,
      ok: true,
      addresses: {
        a: [`203.0.113.${(seed % 200) + 1}`],
        aaaa: [],
        mx: [{ exchange: `mail.${host}`, priority: 10 }],
        primary: { address: `203.0.113.${(seed % 200) + 1}`, family: 4 },
        error: null,
      },
      source: 'simulated',
    }
  },
  async inspectUrl(url): Promise<HeadersResult> {
    return {
      url,
      ok: true,
      status: 200,
      headers: {
        server: 'cyberlab-sim',
        'content-type': 'text/html',
        'strict-transport-security': 'max-age=63072000',
      },
      tls: url.startsWith('https')
        ? {
            authorized: true,
            subject: { CN: new URL(url).hostname },
            issuer: { CN: 'CyberLab Sim CA' },
            valid_from: '2026-01-01',
            valid_to: '2027-01-01',
          }
        : null,
      source: 'simulated',
    }
  },
  async checkPort(host, port): Promise<PortCheckResult> {
    const open = [22, 80, 443, 8080].includes(port)
    return {
      host,
      port,
      ok: open,
      ms: 12 + (port % 7),
      detail: open ? 'connecté (simulé)' : 'connexion refusée (simulé)',
      method: `tcp/${port}`,
      source: 'simulated',
    }
  },
}
