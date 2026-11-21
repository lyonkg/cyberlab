import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FullscreenButton } from './FullscreenButton'

type Patched = { webkitRequestFullscreen?: unknown; webkitFullscreenElement?: unknown; webkitExitFullscreen?: unknown }

afterEach(() => {
  const root = document.documentElement as unknown as Patched
  const doc = document as unknown as Patched
  delete root.webkitRequestFullscreen
  delete doc.webkitExitFullscreen
  delete doc.webkitFullscreenElement
})

describe('FullscreenButton', () => {
  it('renders nothing when the Fullscreen API is missing (iPhone Safari, jsdom)', () => {
    const { container } = render(<FullscreenButton />)
    expect(container).toBeEmptyDOMElement()
  })

  it('uses the WebKit-prefixed API and tracks webkitfullscreenchange', async () => {
    let current: Element | null = null
    const root = document.documentElement as unknown as Patched
    const doc = document as unknown as Patched
    root.webkitRequestFullscreen = vi.fn(() => {
      current = document.documentElement
      document.dispatchEvent(new Event('webkitfullscreenchange'))
    })
    Object.defineProperty(document, 'webkitFullscreenElement', { configurable: true, get: () => current })
    doc.webkitExitFullscreen = vi.fn(() => {
      current = null
      document.dispatchEvent(new Event('webkitfullscreenchange'))
    })

    render(<FullscreenButton />)
    const btn = screen.getByTestId('fullscreen-toggle')
    expect(btn).toHaveAttribute('aria-label', 'Enter fullscreen')

    await act(async () => fireEvent.click(btn))
    expect(root.webkitRequestFullscreen).toHaveBeenCalled()
    expect(btn).toHaveAttribute('aria-label', 'Exit fullscreen')
    expect(btn).toHaveAttribute('aria-pressed', 'true')

    await act(async () => fireEvent.click(btn))
    expect(doc.webkitExitFullscreen).toHaveBeenCalled()
    expect(btn).toHaveAttribute('aria-label', 'Enter fullscreen')
  })
})
