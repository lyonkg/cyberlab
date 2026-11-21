/** Abstract lab provider interface — swap simulated ↔ real via VITE_LAB_MODE / in-app toggle. */

export interface PacketCaptureResult {
  packets: { timestamp: number; summary: string; raw: string }[]
  source: 'simulated' | 'real'
}

export interface CryptoHashResult {
  algorithm: string
  digestHex: string
  source: 'simulated' | 'real'
}

export interface NetworkScanResult {
  host: string
  openPorts: number[]
  source: 'simulated' | 'real'
}

export interface PingResult {
  host: string
  ok: boolean
  method: string
  summary: string
  raw?: string
  source: 'simulated' | 'real'
}

export interface TracerouteResult {
  host: string
  ok: boolean
  method: string
  hops: string
  source: 'simulated' | 'real'
}

export interface DnsResult {
  host: string
  ok: boolean
  addresses: {
    a: string[]
    aaaa: string[]
    mx: { exchange: string; priority: number }[]
    primary: { address: string; family: number } | null
    error: string | null
  }
  source: 'simulated' | 'real'
}

export interface HeadersResult {
  url: string
  ok: boolean
  status: number
  headers: Record<string, string>
  tls: {
    authorized?: boolean
    subject?: unknown
    issuer?: unknown
    valid_from?: string | null
    valid_to?: string | null
  } | null
  source: 'simulated' | 'real'
}

export interface PortCheckResult {
  host: string
  port: number
  ok: boolean
  ms: number
  detail: string
  method: string
  source: 'simulated' | 'real'
}

export interface LabProvider {
  mode: 'simulated' | 'real'
  name: string
  description: string
  capturePackets(iface?: string): Promise<PacketCaptureResult>
  hashPassword(password: string, salt: string, algorithm?: string): Promise<CryptoHashResult>
  scanHost(host: string): Promise<NetworkScanResult>
  ping(host: string): Promise<PingResult>
  traceroute(host: string): Promise<TracerouteResult>
  dnsLookup(host: string): Promise<DnsResult>
  inspectUrl(url: string): Promise<HeadersResult>
  checkPort(host: string, port: number): Promise<PortCheckResult>
}

export type LabMode = 'simulated' | 'real'
