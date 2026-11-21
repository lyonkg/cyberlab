import { useCallback, useEffect, useState, type RefObject } from 'react'
import { getFullscreenElement, isFullscreenSupported, onFullscreenChange, toggleFullscreen } from '../lib/fullscreen'

/**
 * Fullscreen state for an element (or the whole page when no ref is given).
 * `active` is true only when *this* target is the fullscreen element.
 */
export function useFullscreen(target?: RefObject<HTMLElement | null>) {
  const [supported] = useState(() => typeof document !== 'undefined' && isFullscreenSupported())
  const [active, setActive] = useState(false)

  useEffect(() => {
    const sync = () => {
      const el = getFullscreenElement()
      setActive(target ? el !== null && el === target.current : el !== null)
    }
    sync()
    return onFullscreenChange(sync)
  }, [target])

  const toggle = useCallback(() => toggleFullscreen(target?.current ?? null), [target])

  return { supported, active, toggle }
}
