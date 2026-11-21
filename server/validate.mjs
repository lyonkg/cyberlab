/** Strict host / URL validators for the local lab API (no shell metacharacters). */

const HOST_RE = /^(?=.{1,253}$)(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.?$/i
const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/

export function isIpv4(ip) {
  if (!IPV4_RE.test(ip)) return false
  return ip.split('.').every((p) => {
    const n = Number(p)
    return n >= 0 && n <= 255 && String(n) === p.replace(/^0+(?=\d)/, p === '0' ? '0' : '')
  })
}

/** Hostname or IPv4 — no ports, paths, spaces, or shell metacharacters. */
export function isSafeHost(value) {
  if (typeof value !== 'string') return false
  const v = value.trim().toLowerCase()
  if (!v || v.length > 253) return false
  if (/[^a-z0-9.-]/.test(v)) return false
  if (v.includes('..') || v.startsWith('.') || v.startsWith('-')) return false
  if (isIpv4(v)) return true
  return HOST_RE.test(v) && !v.endsWith('.')
}

export function isSafePort(value) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 65535
}

/** http(s) URL with host only from allowlist shape; no credentials, no weird schemes. */
export function isSafeHttpUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false
  let u
  try {
    u = new URL(value)
  } catch {
    return false
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
  if (u.username || u.password) return false
  if (!isSafeHost(u.hostname)) return false
  return true
}

export function json(res, status, body) {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  })
  res.end(data)
}
