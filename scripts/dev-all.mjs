import { spawn } from 'node:child_process'

const kids = [
  spawn('node', ['server/index.mjs'], { stdio: 'inherit' }),
  spawn('npx', ['vite'], { stdio: 'inherit' }),
]
const stop = () => {
  for (const k of kids) {
    try {
      k.kill('SIGTERM')
    } catch {
      /* ignore */
    }
  }
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
