/**
 * Decide which router the app uses, from build-time settings.
 *
 * - `VITE_ROUTER=hash`, or a relative base (`--base ./`), selects HashRouter: URLs look like
 *   `index.html#/modules/sqli` and work from ANY folder or static server with no rewrite rules
 *   (used by the macOS zip served with `python3 -m http.server`).
 * - Otherwise BrowserRouter with `basename` = Vite's BASE_URL without the trailing slash, so
 *   `VITE_BASE=/cyberlab/` (GitHub Pages project site) gives `/cyberlab/modules/sqli`.
 */
export type RouterConfig = { kind: 'hash' } | { kind: 'browser'; basename: string }

export function resolveRouterConfig(baseUrl: string | undefined, routerEnv: string | undefined): RouterConfig {
  const base = (baseUrl ?? '/').trim() || '/'
  if ((routerEnv ?? '').toLowerCase() === 'hash' || base === '' || base.startsWith('.')) {
    return { kind: 'hash' }
  }
  let basename = base.startsWith('/') ? base : `/${base}`
  basename = basename.replace(/\/+$/, '')
  return { kind: 'browser', basename: basename === '' ? '/' : basename }
}
