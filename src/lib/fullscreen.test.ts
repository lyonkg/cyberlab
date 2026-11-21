import { describe, expect, it, vi } from 'vitest'
import {
  exitFullscreen,
  getFullscreenElement,
  isFullscreenSupported,
  onFullscreenChange,
  requestFullscreen,
  toggleFullscreen,
} from './fullscreen'

/** Minimal fake document: lets us emulate standard, WebKit-only and unsupported browsers. */
function fakeDoc(kind: 'standard' | 'webkit' | 'none') {
  const listeners = new Map<string, Set<() => void>>()
  const state: { fs: Element | null } = { fs: null }
  const fire = (ev: string) => listeners.get(ev)?.forEach((cb) => cb())
  const root: Record<string, unknown> = {}
  const doc: Record<string, unknown> = {
    documentElement: root,
    addEventListener: (ev: string, cb: () => void) => {
      if (!listeners.has(ev)) listeners.set(ev, new Set())
      listeners.get(ev)!.add(cb)
    },
    removeEventListener: (ev: string, cb: () => void) => listeners.get(ev)?.delete(cb),
  }
  if (kind === 'standard') {
    root.requestFullscreen = vi.fn(async () => {
      state.fs = root as unknown as Element
      fire('fullscreenchange')
    })
    Object.defineProperty(doc, 'fullscreenElement', { get: () => state.fs })
    doc.fullscreenEnabled = true
    doc.exitFullscreen = vi.fn(async () => {
      state.fs = null
      fire('fullscreenchange')
    })
  } else if (kind === 'webkit') {
    // Legacy Safari: prefixed API, returns undefined instead of a promise.
    root.webkitRequestFullscreen = vi.fn(() => {
      state.fs = root as unknown as Element
      fire('webkitfullscreenchange')
    })
    Object.defineProperty(doc, 'webkitFullscreenElement', { get: () => state.fs })
    doc.webkitFullscreenEnabled = true
    doc.webkitExitFullscreen = vi.fn(() => {
      state.fs = null
      fire('webkitfullscreenchange')
    })
  }
  return { doc: doc as unknown as Document, root: root as unknown as HTMLElement, fire }
}

describe('fullscreen helpers', () => {
  it('detects standard, webkit-prefixed and missing APIs', () => {
    expect(isFullscreenSupported(fakeDoc('standard').doc)).toBe(true)
    expect(isFullscreenSupported(fakeDoc('webkit').doc)).toBe(true)
    expect(isFullscreenSupported(fakeDoc('none').doc)).toBe(false)
  })

  it('respects fullscreenEnabled=false (e.g. iframe without allowfullscreen)', () => {
    const { doc } = fakeDoc('webkit')
    ;(doc as unknown as { webkitFullscreenEnabled: boolean }).webkitFullscreenEnabled = false
    expect(isFullscreenSupported(doc)).toBe(false)
  })

  it('enters and exits with the standard API', async () => {
    const { doc, root } = fakeDoc('standard')
    expect(await requestFullscreen(root)).toBe(true)
    expect(getFullscreenElement(doc)).toBe(root)
    expect(await exitFullscreen(doc)).toBe(true)
    expect(getFullscreenElement(doc)).toBeNull()
  })

  it('falls back to webkitRequestFullscreen / webkitExitFullscreen (Safari)', async () => {
    const { doc, root } = fakeDoc('webkit')
    expect(await toggleFullscreen(null, doc)).toBe(true)
    expect((root as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen).toHaveBeenCalled()
    expect(getFullscreenElement(doc)).toBe(root)
    expect(await toggleFullscreen(null, doc)).toBe(false)
    expect(getFullscreenElement(doc)).toBeNull()
  })

  it('returns false instead of throwing when the request is rejected', async () => {
    const { root } = fakeDoc('standard')
    ;(root as unknown as { requestFullscreen: () => Promise<void> }).requestFullscreen = () =>
      Promise.reject(new TypeError('Permissions check failed'))
    expect(await requestFullscreen(root)).toBe(false)
  })

  it('is a no-op when unsupported', async () => {
    const { doc, root } = fakeDoc('none')
    expect(await requestFullscreen(root)).toBe(false)
    expect(await exitFullscreen(doc)).toBe(false)
  })

  it('listens to both fullscreenchange and webkitfullscreenchange, and unsubscribes', () => {
    const { doc, fire } = fakeDoc('webkit')
    const cb = vi.fn()
    const off = onFullscreenChange(cb, doc)
    fire('webkitfullscreenchange')
    fire('fullscreenchange')
    expect(cb).toHaveBeenCalledTimes(2)
    off()
    fire('webkitfullscreenchange')
    expect(cb).toHaveBeenCalledTimes(2)
  })
})
