import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearLabModeOverride, getLabMode, setLabMode } from '../mode'
import { getLabProvider } from './index'
import { simulatedProvider } from './simulated'

describe('lab mode + providers', () => {
  afterEach(() => {
    clearLabModeOverride()
    vi.unstubAllGlobals()
  })

  it('defaults to simulated and returns the simulated provider', () => {
    expect(getLabMode()).toBe('simulated')
    expect(getLabProvider().mode).toBe('simulated')
    expect(getLabProvider().name).toBe(simulatedProvider.name)
  })

  it('honors localStorage override', () => {
    setLabMode('real')
    expect(getLabMode()).toBe('real')
    expect(getLabProvider().mode).toBe('real')
  })

  it('simulated ping returns a canned summary', async () => {
    const r = await simulatedProvider.ping('example.com')
    expect(r.source).toBe('simulated')
    expect(r.ok).toBe(true)
    expect(r.summary).toMatch(/simulated/i)
  })

  it('real provider surfaces a clear error when the API is down', async () => {
    setLabMode('real')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    const p = getLabProvider()
    await expect(p.ping('example.com')).rejects.toThrow(/unreachable|Lab API/i)
  })

  it('real provider maps a successful ping response', async () => {
    setLabMode('real')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          host: 'example.com',
          ok: true,
          method: 'tcp-fallback',
          summary: 'ok',
          raw: '',
        }),
      }),
    )
    const r = await getLabProvider().ping('example.com')
    expect(r.source).toBe('real')
    expect(r.ok).toBe(true)
  })
})
