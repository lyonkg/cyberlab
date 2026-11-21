/**
 * Safe wrappers around system networking helpers.
 * Always use execFile/spawn with argument arrays — never a shell string.
 * Falls back to TCP connect timing when ICMP binaries are missing/blocked.
 */
import { execFile } from 'node:child_process'
import { createConnection } from 'node:net'
import { lookup as dnsLookup, resolve4, resolve6, resolveMx } from 'node:dns/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { promisify } from 'node:util'
import { isSafeHost, isSafeHttpUrl, isSafePort } from './validate.mjs'

const execFileAsync = promisify(execFile)
const TIMEOUT_MS = 8_000

function timed(promise, ms = TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timed out after ${ms}ms`)), ms)),
  ])
}

async function which(bin) {
  try {
    const { stdout } = await execFileAsync('which', [bin], { timeout: 2000 })
    return stdout.trim() || null
  } catch {
    return null
  }
}

/** TCP connect probe used when ping/traceroute binaries are unavailable. */
export function tcpProbe(host, port = 443, ms = 3000) {
  return new Promise((resolve) => {
    const started = Date.now()
    const socket = createConnection({ host, port, family: 4 })
    const done = (ok, detail) => {
      try {
        socket.destroy()
      } catch {
        /* ignore */
      }
      resolve({ ok, ms: Date.now() - started, detail, method: `tcp/${port}` })
    }
    socket.setTimeout(ms)
    socket.on('connect', () => done(true, 'connected'))
    socket.on('timeout', () => done(false, 'timeout'))
    socket.on('error', (e) => done(false, e.message))
  })
}

export async function pingHost(host) {
  if (!isSafeHost(host)) throw new Error('invalid host')
  const bin = (await which('ping')) || (await which('ping6'))
  if (bin) {
    try {
      // -c 3 count, -W 2 deadline-ish (Linux); mac uses -t — stick to Linux flags for the box
      const { stdout, stderr } = await timed(
        execFileAsync(bin, ['-c', '3', '-W', '2', host], { timeout: TIMEOUT_MS, maxBuffer: 64_000 }),
      )
      return {
        host,
        ok: true,
        method: 'icmp',
        summary: (stdout || stderr).trim().split('\n').slice(-5).join('\n'),
        raw: (stdout || '').trim(),
      }
    } catch (e) {
      // Binary present but ICMP blocked → fall through to TCP
      const probe = await tcpProbe(host, 443)
      return {
        host,
        ok: probe.ok,
        method: 'tcp-fallback',
        summary: `ICMP ping failed (${e.message}). TCP :443 probe ${probe.ok ? 'ok' : 'failed'} in ${probe.ms}ms (${probe.detail}).`,
        raw: String(e.stderr || e.message || e),
      }
    }
  }
  const probe = await tcpProbe(host, 443)
  return {
    host,
    ok: probe.ok,
    method: 'tcp-fallback',
    summary: `No ping binary. TCP :443 probe ${probe.ok ? 'ok' : 'failed'} in ${probe.ms}ms (${probe.detail}).`,
    raw: '',
  }
}

export async function tracerouteHost(host) {
  if (!isSafeHost(host)) throw new Error('invalid host')
  const bin = (await which('traceroute')) || (await which('tracepath'))
  if (bin) {
    try {
      const args = bin.endsWith('tracepath') ? ['-n', host] : ['-n', '-w', '2', '-q', '1', '-m', '15', host]
      const { stdout, stderr } = await timed(
        execFileAsync(bin, args, { timeout: TIMEOUT_MS, maxBuffer: 128_000 }),
      )
      return {
        host,
        ok: true,
        method: bin.includes('tracepath') ? 'tracepath' : 'traceroute',
        hops: (stdout || stderr).trim(),
      }
    } catch (e) {
      const probe = await tcpProbe(host, 443)
      return {
        host,
        ok: probe.ok,
        method: 'tcp-fallback',
        hops: `traceroute failed (${e.message}). TCP :443 ${probe.ok ? 'reachable' : 'unreachable'} in ${probe.ms}ms.`,
      }
    }
  }
  const probe = await tcpProbe(host, 443)
  return {
    host,
    ok: probe.ok,
    method: 'tcp-fallback',
    hops: `No traceroute binary. TCP :443 ${probe.ok ? 'reachable' : 'unreachable'} in ${probe.ms}ms.`,
  }
}

export async function dnsLookupHost(host) {
  if (!isSafeHost(host)) throw new Error('invalid host')
  const [a, aaaa, mx, primary] = await Promise.allSettled([
    resolve4(host),
    resolve6(host),
    resolveMx(host),
    dnsLookup(host),
  ])
  return {
    host,
    ok: primary.status === 'fulfilled',
    addresses: {
      a: a.status === 'fulfilled' ? a.value : [],
      aaaa: aaaa.status === 'fulfilled' ? aaaa.value : [],
      mx: mx.status === 'fulfilled' ? mx.value : [],
      primary: primary.status === 'fulfilled' ? primary.value : null,
      error: primary.status === 'rejected' ? String(primary.reason.message || primary.reason) : null,
    },
  }
}

export async function inspectUrl(url) {
  if (!isSafeHttpUrl(url)) throw new Error('invalid url')
  const u = new URL(url)
  const lib = u.protocol === 'https:' ? httpsRequest : httpRequest
  return timed(
    new Promise((resolve, reject) => {
      const req = lib(
        {
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: `${u.pathname}${u.search}`,
          method: 'HEAD',
          timeout: TIMEOUT_MS,
          headers: { 'user-agent': 'CyberLab-LabAPI/1.0', accept: '*/*' },
          // For teaching we still verify TLS by default; allow opt-out only via query elsewhere if needed
          rejectUnauthorized: true,
        },
        (res) => {
          const headers = {}
          for (const [k, v] of Object.entries(res.headers)) headers[k] = Array.isArray(v) ? v.join(', ') : v
          const tls =
            u.protocol === 'https:' && res.socket?.getPeerCertificate
              ? (() => {
                  const c = res.socket.getPeerCertificate()
                  return {
                    authorized: res.socket.authorized,
                    subject: c?.subject || null,
                    issuer: c?.issuer || null,
                    valid_from: c?.valid_from || null,
                    valid_to: c?.valid_to || null,
                  }
                })()
              : null
          res.resume()
          resolve({
            url,
            ok: true,
            status: res.statusCode,
            headers,
            tls,
          })
        },
      )
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('request timed out'))
      })
      req.on('error', reject)
      req.end()
    }),
  )
}

export async function checkPort(host, port) {
  if (!isSafeHost(host)) throw new Error('invalid host')
  if (!isSafePort(port)) throw new Error('invalid port')
  const probe = await tcpProbe(host, Number(port))
  return { host, port: Number(port), ...probe }
}
