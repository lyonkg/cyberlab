#!/usr/bin/env node
// Build the relocatable macOS bundle: static build (relative base + HashRouter) + launcher + French README.
// Usage: npm run build:mac            → release/cyberlab-mac.zip
//        npm run build:mac -- /path/to/cyberlab-mac.zip
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const out = resolve(process.argv[2] ?? resolve(root, 'release/cyberlab-mac.zip'))
const env = { ...process.env, VITE_BASE: './', VITE_ROUTER: 'hash', VITE_LAB_MODE: process.env.VITE_LAB_MODE ?? 'simulated' }

const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, env, stdio: 'inherit' })
run('npx', ['tsc', '-b'])
run('npx', ['vite', 'build', '--outDir', 'dist-mac', '--emptyOutDir'])
run('python3', ['scripts/package_mac.py', 'dist-mac', out])
