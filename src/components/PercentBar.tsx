import { useId } from 'react'
import { clampInt } from '../lib/validation'

/** Progress bar that uses SVG attributes instead of inline CSS (keeps CSP style-src 'self'). */
export function PercentBar({
  value,
  className = '',
  heightClass = 'h-1.5',
}: {
  value: number
  className?: string
  heightClass?: string
}) {
  const pct = clampInt(value, 0, 100, 0)
  const gid = useId().replace(/:/g, '')
  return (
    <div
      className={`${heightClass} rounded-full bg-slate-800 overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 10" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={pct} height="10" fill={`url(#${gid})`} />
      </svg>
    </div>
  )
}
