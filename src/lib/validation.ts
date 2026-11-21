/**
 * Shared input limits and validators for CyberLab.
 * Teaching labs (SQLi, etc.) may still contain quotes and SQL metacharacters;
 * we only bound length/type so input cannot escape the in-browser simulation.
 */

export const LIMITS = {
  /** Generic single-line text (IPs mid-typing, salts, keys). */
  text: 256,
  /** Username/password/search payload fed to the in-memory SQL labs. */
  sqlInput: 1024,
  /** Full SQL string the simulated engines will tokenize. */
  sqlQuery: 4096,
  /** Max tokens the simulated SQL lexer will accept. */
  sqlTokens: 400,
  password: 256,
  passphrase: 256,
  aesPlain: 4096,
  cipherText: 4096,
  cipherKey: 128,
  salt: 128,
  ip: 64,
  id: 64,
  path: 200,
  progressJson: 32_768,
  progressList: 200,
  quizScore: 10_000,
} as const

export function clampLength(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.length > max ? value.slice(0, max) : value
}

/** Lesson, lab, and module identifiers written to localStorage. */
export function isProgressId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(value)
}

/** In-app path (from the router), stored as lastVisited. */
export function isAppPath(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (!value.startsWith('/') || value.length > LIMITS.path) return false
  if (value.includes('//') || value.includes('\\') || value.includes('..')) return false
  if (/[\s<>"'`\\]/.test(value)) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(value.slice(1))) return false
  return /^\/[a-z0-9/_-]*$/i.test(value)
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

/** Firewall rule port: 0–65535 or the literal "any". */
export function parsePortInput(raw: string): number | 'any' | null {
  const v = raw.trim().toLowerCase()
  if (v === 'any' || v === '*') return 'any'
  if (!/^\d{1,5}$/.test(v)) return null
  const n = Number(v)
  if (!Number.isInteger(n) || n < 0 || n > 65535) return null
  return n
}

/** Packet dest port: numeric only. */
export function parsePacketPort(raw: string): number | null {
  const p = parsePortInput(raw)
  if (p === 'any' || p === null) return null
  return p
}

function isIpv4(ip: string): boolean {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false
    const n = Number(p)
    return n >= 0 && n <= 255
  })
}

/**
 * IPv4, IPv4/CIDR, or the lab wildcards any / * / 0.0.0.0/0.
 * Incomplete mid-typing values (e.g. "10.0.") are rejected — callers should
 * only commit a new value when this returns true, otherwise keep the draft
 * visually but not as a trusted pattern.
 */
export function isIpOrCidrOrAny(value: string): boolean {
  const v = value.trim()
  if (v.length === 0 || v.length > LIMITS.ip) return false
  if (v === 'any' || v === '*' || v === '0.0.0.0/0') return true
  const slash = v.indexOf('/')
  if (slash === -1) return isIpv4(v)
  const net = v.slice(0, slash)
  const bits = v.slice(slash + 1)
  if (!isIpv4(net) || !/^\d{1,2}$/.test(bits)) return false
  const n = Number(bits)
  return n >= 0 && n <= 32
}

/**
 * Allowed bases for a future real lab provider: an https:// URL with no
 * embedded credentials, or a same-origin path starting with a single slash.
 * javascript:, data:, file:, ws:, and protocol-relative URLs are rejected.
 */
export function isAllowedLabApiBase(base: string): boolean {
  const t = base.trim()
  if (!t || t.length > 1024) return false
  if (t.startsWith('/') && !t.startsWith('//')) {
    return isAppPath(t) || /^\/[a-z0-9/_.:-]*$/i.test(t)
  }
  let u: URL
  try {
    u = new URL(t)
  } catch {
    return false
  }
  if (u.username !== '' || u.password !== '') return false
  if (!u.hostname) return false
  // Teaching lab API may run on loopback over plain HTTP; everything else must be HTTPS.
  if (u.protocol === 'http:') {
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]'
  }
  if (u.protocol !== 'https:') return false
  return true
}

/**
 * Resolve a path against a configured lab API base and refuse to leave that origin.
 * The real provider stub does not call fetch; use this if you wire it later.
 */
export function resolveLabApiUrl(
  path: string,
  base: string,
  locationOrigin?: string,
): URL {
  if (!isAllowedLabApiBase(base)) {
    throw new Error(
      'Adresse de base de l’API de lab refusée : seule une URL https:// (sans identifiants), un chemin de même origine ou http://127.0.0.1 / localhost est autorisé.',
    )
  }
  const trimmed = base.trim()
  const origin =
    locationOrigin ?? (typeof location !== 'undefined' ? location.origin : undefined)
  const baseUrl = trimmed.startsWith('/')
    ? new URL(trimmed, origin ?? 'https://localhost')
    : new URL(trimmed)

  const p = path.trim()
  if (!p || p.startsWith('//') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(p)) {
    throw new Error('Chemin d’API de lab refusé : chemin absolu ou avec protocole.')
  }

  const baseHref = baseUrl.href.endsWith('/') ? baseUrl.href : `${baseUrl.href}/`
  const resolved = new URL(p.replace(/^\//, ''), baseHref)
  if (resolved.origin !== baseUrl.origin) {
    throw new Error('URL d’API de lab refusée : elle change d’origine.')
  }
  if (baseUrl.protocol === 'https:' && resolved.protocol !== 'https:') {
    throw new Error('URL d’API de lab refusée : elle n’est pas en HTTPS.')
  }
  return resolved
}

export function isSafeHttpUrlForDisplay(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
