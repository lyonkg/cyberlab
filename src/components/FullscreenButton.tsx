import { Maximize2, Minimize2 } from 'lucide-react'
import type { RefObject } from 'react'
import { useFullscreen } from '../hooks/useFullscreen'

type Props = {
  /** Element to put in fullscreen; omit for the whole app. */
  target?: RefObject<HTMLElement | null>
  testId?: string
  /** Show a text label next to the icon. */
  showLabel?: boolean
  className?: string
}

export function FullscreenButton({ target, testId = 'fullscreen-toggle', showLabel = false, className = '' }: Props) {
  const { supported, active, toggle } = useFullscreen(target)
  // iPhone Safari and some embedded webviews have no element fullscreen: hide rather than show a dead button.
  if (!supported) return null
  const label = active ? 'Exit fullscreen' : target ? 'Lab fullscreen' : 'Enter fullscreen'
  const Icon = active ? Minimize2 : Maximize2
  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-label={label}
      aria-pressed={active}
      title={`${label} (Esc to leave)`}
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white ${className}`}
    >
      <Icon className="h-4 w-4" />
      {showLabel && <span className="text-xs">{active ? 'Exit fullscreen' : 'Fullscreen'}</span>}
    </button>
  )
}
