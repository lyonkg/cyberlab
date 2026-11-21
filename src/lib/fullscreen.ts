/**
 * Cross-browser Fullscreen API helpers.
 *
 * Safari (macOS < 16.4 and every WebKit build that still ships the legacy API)
 * only exposes the `webkit`-prefixed variants, and iPhone Safari exposes no
 * element fullscreen at all (video only). Everything here degrades to a no-op
 * when the API is missing so callers can simply hide their button.
 */

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: (options?: unknown) => Promise<void> | void
  webkitRequestFullScreen?: (options?: unknown) => Promise<void> | void
}

type WebkitDocument = Document & {
  webkitFullscreenEnabled?: boolean
  webkitFullscreenElement?: Element | null
  webkitCurrentFullScreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
  webkitCancelFullScreen?: () => Promise<void> | void
}

export const FULLSCREEN_EVENTS = ['fullscreenchange', 'webkitfullscreenchange'] as const

export function isFullscreenSupported(doc: Document = document): boolean {
  const d = doc as WebkitDocument
  const el = d.documentElement as WebkitElement | null
  if (!el) return false
  const hasRequest =
    typeof el.requestFullscreen === 'function' ||
    typeof el.webkitRequestFullscreen === 'function' ||
    typeof el.webkitRequestFullScreen === 'function'
  // `fullscreenEnabled` is false inside iframes without allow="fullscreen".
  const enabled = d.fullscreenEnabled ?? d.webkitFullscreenEnabled ?? true
  return hasRequest && enabled !== false
}

export function getFullscreenElement(doc: Document = document): Element | null {
  const d = doc as WebkitDocument
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? d.webkitCurrentFullScreenElement ?? null
}

export function isFullscreen(doc: Document = document): boolean {
  return getFullscreenElement(doc) !== null
}

export async function requestFullscreen(el: HTMLElement): Promise<boolean> {
  const e = el as WebkitElement
  try {
    if (typeof e.requestFullscreen === 'function') {
      await e.requestFullscreen({ navigationUI: 'hide' })
    } else if (typeof e.webkitRequestFullscreen === 'function') {
      await e.webkitRequestFullscreen()
    } else if (typeof e.webkitRequestFullScreen === 'function') {
      await e.webkitRequestFullScreen()
    } else {
      return false
    }
    return true
  } catch {
    // Rejected (no user gesture, permissions policy, iframe without allowfullscreen…).
    return false
  }
}

export async function exitFullscreen(doc: Document = document): Promise<boolean> {
  const d = doc as WebkitDocument
  if (!isFullscreen(doc)) return false
  try {
    if (typeof d.exitFullscreen === 'function') await d.exitFullscreen()
    else if (typeof d.webkitExitFullscreen === 'function') await d.webkitExitFullscreen()
    else if (typeof d.webkitCancelFullScreen === 'function') await d.webkitCancelFullScreen()
    else return false
    return true
  } catch {
    return false
  }
}

/** Enter fullscreen on `el` (default: whole page), or leave it if anything is already fullscreen. */
export async function toggleFullscreen(el?: HTMLElement | null, doc: Document = document): Promise<boolean> {
  if (isFullscreen(doc)) {
    await exitFullscreen(doc)
    return false
  }
  return requestFullscreen(el ?? doc.documentElement)
}

/** Subscribe to standard + webkit fullscreen change events. Returns an unsubscribe function. */
export function onFullscreenChange(cb: () => void, doc: Document = document): () => void {
  for (const ev of FULLSCREEN_EVENTS) doc.addEventListener(ev, cb)
  return () => {
    for (const ev of FULLSCREEN_EVENTS) doc.removeEventListener(ev, cb)
  }
}
