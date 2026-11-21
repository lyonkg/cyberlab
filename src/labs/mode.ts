/**
 * Lab mode selection: env default, overridable via localStorage for the in-app toggle.
 */
import type { LabMode } from './providers/types'

const STORAGE_KEY = 'cyberlab-lab-mode'

export function envLabMode(): LabMode {
  const mode = (import.meta.env.VITE_LAB_MODE as string | undefined)?.toLowerCase()
  return mode === 'real' ? 'real' : 'simulated'
}

export function envLabApiBase(): string {
  return (
    (import.meta.env.VITE_LAB_API_URL as string | undefined)?.trim() ||
    (import.meta.env.VITE_LAB_API_BASE as string | undefined)?.trim() ||
    'http://127.0.0.1:8787'
  )
}

export function getStoredLabMode(): LabMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'real' || v === 'simulated') return v
  } catch {
    /* ignore */
  }
  return null
}

export function getLabMode(): LabMode {
  return getStoredLabMode() ?? envLabMode()
}

export function setLabMode(mode: LabMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cyberlab-lab-mode', { detail: mode }))
  }
}

export function clearLabModeOverride(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cyberlab-lab-mode', { detail: getLabMode() }))
  }
}
