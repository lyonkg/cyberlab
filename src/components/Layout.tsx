import {
  Activity,
  BookOpen,
  FlaskConical,
  Menu,
  Shield,
  Wrench,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { getLabMode } from '../labs/providers'
import { MODULES, totalLabCount, totalLessonCount, totalQuizCount } from '../data/modules'
import { progressPercent } from '../lib/progress'
import { useEffect } from 'react'
import { useProgress } from '../hooks/useProgress'
import { FullscreenButton } from './FullscreenButton'
import { PercentBar } from './PercentBar'

const nav = [
  { to: '/', label: 'Home', icon: BookOpen },
  { to: '/labs', label: 'Labs', icon: FlaskConical },
  { to: '/progress', label: 'Progress', icon: Activity },
  { to: '/tools', label: 'Tools', icon: Wrench },
]

export function Layout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { visit } = useProgress()
  const pct = progressPercent(totalLessonCount(), totalLabCount(), totalQuizCount())
  const mode = getLabMode()

  useEffect(() => {
    visit(location.pathname)
    setOpen(false)
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 glass border-b border-slate-700/60">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300">
              <Shield className="h-5 w-5" />
            </span>
            <span>
              Cyber<span className="text-cyan-300">Lab</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition ${
                    isActive
                      ? 'bg-cyan-400/15 text-cyan-200'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Labs: {mode}
              </span>
              <PercentBar value={pct} className="w-24" />
            </div>
            <FullscreenButton />
            <button
              type="button"
              className="md:hidden p-2 rounded-lg hover:bg-slate-800"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-slate-700/60 px-4 py-3 space-y-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    isActive ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-300'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-slate-700/60 mt-2">
              <p className="text-xs text-slate-400 mb-1">Modules</p>
              {MODULES.map((m) => (
                <NavLink
                  key={m.id}
                  to={m.path}
                  className="block px-3 py-1.5 text-sm text-slate-300 hover:text-white"
                >
                  {m.title}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        CyberLab — simulated environments only. Never attack systems you do not own or have permission to test.
      </footer>
    </div>
  )
}
