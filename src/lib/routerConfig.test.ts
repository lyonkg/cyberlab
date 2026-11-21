import { describe, expect, it } from 'vitest'
import { resolveRouterConfig } from './routerConfig'

describe('resolveRouterConfig', () => {
  it('defaults to BrowserRouter at the root', () => {
    expect(resolveRouterConfig('/', undefined)).toEqual({ kind: 'browser', basename: '/' })
    expect(resolveRouterConfig(undefined, '')).toEqual({ kind: 'browser', basename: '/' })
  })

  it('uses the sub-path as basename (GitHub Pages project site)', () => {
    expect(resolveRouterConfig('/cyberlab/', undefined)).toEqual({ kind: 'browser', basename: '/cyberlab' })
    expect(resolveRouterConfig('cyberlab', 'browser')).toEqual({ kind: 'browser', basename: '/cyberlab' })
  })

  it('switches to HashRouter for relative bases (Mac zip) or VITE_ROUTER=hash', () => {
    expect(resolveRouterConfig('./', undefined)).toEqual({ kind: 'hash' })
    expect(resolveRouterConfig('/', 'hash')).toEqual({ kind: 'hash' })
    expect(resolveRouterConfig('/cyberlab/', 'HASH')).toEqual({ kind: 'hash' })
  })
})
