#!/usr/bin/env node
/**
 * CyberLab local lab API — no paid keys.
 * Endpoints: /health /ping /traceroute /dns /headers /port
 * Bind: 127.0.0.1 only. Rate-limited. Strict input validation.
 *
 *   node server/index.mjs
 *   PORT=8787 node server/index.mjs
 */
import http from 'node:http'
import { checkPort, dnsLookupHost, inspectUrl, pingHost, tracerouteHost } from './tools.mjs'
import { isSafeHost, isSafeHttpUrl, isSafePort, json } from './validate.mjs'

const PORT = Number(process.env.PORT || 8787)
const HOST = '127.0.0.1'

/** Simple token-bucket per IP: 30 req / 60s. */
const buckets = new Map()
function rateLimit(ip) {
  const now = Date.now()
  let b = buckets.get(ip)
  if (!b || now - b.start > 60_000) {
    b = { start: now, count: 0 }
    buckets.set(ip, b)
  }
  b.count++
  return b.count <= 30
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 4096) {
        reject(new Error('corps de requête trop volumineux'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function q(url, key) {
  return url.searchParams.get(key) || ''
}

const server = http.createServer(async (req, res) => {
  const ip = req.socket.remoteAddress || 'unknown'
  if (req.method === 'OPTIONS') return json(res, 204, {})
  if (!rateLimit(ip)) return json(res, 429, { error: 'trop de requêtes (limite : 30 par minute)' })

  let url
  try {
    url = new URL(req.url || '/', `http://${HOST}:${PORT}`)
  } catch {
    return json(res, 400, { error: 'URL de requête invalide' })
  }

  try {
    if (url.pathname === '/health' && req.method === 'GET') {
      return json(res, 200, { ok: true, service: 'cyberlab-lab-api', version: 1 })
    }

    let body = {}
    if (req.method === 'POST') body = await readJson(req)

    if (url.pathname === '/ping' && (req.method === 'GET' || req.method === 'POST')) {
      const host = (body.host || q(url, 'host') || '').trim()
      if (!isSafeHost(host)) return json(res, 400, { error: 'hôte invalide' })
      return json(res, 200, await pingHost(host))
    }
    if (url.pathname === '/traceroute' && (req.method === 'GET' || req.method === 'POST')) {
      const host = (body.host || q(url, 'host') || '').trim()
      if (!isSafeHost(host)) return json(res, 400, { error: 'hôte invalide' })
      return json(res, 200, await tracerouteHost(host))
    }
    if (url.pathname === '/dns' && (req.method === 'GET' || req.method === 'POST')) {
      const host = (body.host || q(url, 'host') || '').trim()
      if (!isSafeHost(host)) return json(res, 400, { error: 'hôte invalide' })
      return json(res, 200, await dnsLookupHost(host))
    }
    if (url.pathname === '/headers' && (req.method === 'GET' || req.method === 'POST')) {
      const target = (body.url || q(url, 'url') || '').trim()
      if (!isSafeHttpUrl(target)) return json(res, 400, { error: 'URL invalide (http:// ou https:// uniquement)' })
      return json(res, 200, await inspectUrl(target))
    }
    if (url.pathname === '/port' && (req.method === 'GET' || req.method === 'POST')) {
      const host = (body.host || q(url, 'host') || '').trim()
      const port = body.port ?? q(url, 'port')
      if (!isSafeHost(host) || !isSafePort(port)) return json(res, 400, { error: 'hôte ou port invalide' })
      return json(res, 200, await checkPort(host, port))
    }

    return json(res, 404, { error: 'route introuvable' })
  } catch (e) {
    return json(res, 500, { error: e instanceof Error ? e.message : String(e) })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`API de lab CyberLab à l’écoute sur http://${HOST}:${PORT}`)
})
