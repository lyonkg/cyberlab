import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/** GitHub Pages SPA fallback: serve the app for unknown paths via <outDir>/404.html. */
function spaFallback404(): Plugin {
  let outDir = resolve(import.meta.dirname, 'dist')
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const index = resolve(outDir, 'index.html')
      if (existsSync(index)) copyFileSync(index, resolve(outDir, '404.html'))
    },
  }
}

/**
 * Vite HMR needs eval and a websocket in development. Strip the production CSP
 * meta from index.html while the dev server is running; the built files keep it.
 */
function relaxCspInDev(): Plugin {
  return {
    name: 'relax-csp-in-dev',
    transformIndexHtml(html, ctx) {
      if (!ctx.server) return html
      return html.replace(/\s*<meta\s+http-equiv="Content-Security-Policy"[^>]*>/i, '')
    },
  }
}

/**
 * Public base path. `/` by default; `VITE_BASE=/cyberlab/` for a GitHub Pages project site;
 * `VITE_BASE=./` for a relocatable build (macOS zip — pairs with the HashRouter).
 * `vite build --base …` on the CLI still overrides this.
 */
const base = process.env.VITE_BASE?.trim() || '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), spaFallback404(), relaxCspInDev()],
  build: {
    rolldownOptions: {
      output: {
        // Keep React/router in a long-cacheable vendor chunk, Recharts in its own chunk.
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: 'charts', test: /node_modules[\\/](recharts|d3-|victory-vendor|es-toolkit|immer|redux|@reduxjs|reselect|decimal\.js)/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules/**', 'dist/**', 'dist-mac/**', 'release/**', 'server/**'],
  },
  preview: {
    headers: {
      'Content-Security-Policy':
        "default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' http://127.0.0.1:8787 http://localhost:8787; form-action 'self'; frame-src 'none'; frame-ancestors 'none'; worker-src 'self'; manifest-src 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },
})
