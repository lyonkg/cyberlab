import {
  Activity,
  Bug,
  Database,
  Eye,
  Lock,
  Mail,
  Network,
  Shield,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { MODULES } from '../data/modules'
import { getLabProvider } from '../labs/providers'
import { useProgress } from '../hooks/useProgress'

const ICONS: Record<string, LucideIcon> = {
  Network,
  Lock,
  Mail,
  Bug,
  Activity,
  Eye,
  Database,
  Shield,
}

export function HomePage() {
  const provider = getLabProvider()
  const { progress } = useProgress()

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 p-8 sm:p-10">
        <div className="relative z-10 max-w-2xl">
          <p className="text-cyan-300 text-sm font-medium mb-2">Interactive cybersecurity academy</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Learn security by breaking (simulated) things safely
          </h1>
          <p className="mt-4 text-slate-300 leading-relaxed">
            Lessons, live attack simulations, network diagrams, crypto playgrounds, and quizzes — all
            client-side. No paid API keys. Lab mode:{' '}
            <span className="text-cyan-300 font-mono text-sm">{provider.mode}</span>.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/modules/network"
              className="px-4 py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-semibold text-sm hover:bg-cyan-300"
            >
              Start with Network Security
            </Link>
            <Link
              to="/labs"
              className="px-4 py-2.5 rounded-xl border border-slate-600 text-sm text-slate-200 hover:bg-slate-800"
            >
              Browse all labs
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Modules</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((m) => {
            const Icon = ICONS[m.icon] ?? Shield
            const quiz = progress.quizScores[m.id]
            const lessonsDone = m.lessons.filter((l) =>
              progress.completedLessons.includes(l.id),
            ).length
            return (
              <Link
                key={m.id}
                to={m.path}
                className="glass rounded-2xl p-5 hover:border-cyan-500/40 transition group"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 group-hover:bg-cyan-400/20">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white">{m.title}</h3>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{m.description}</p>
                    <p className="text-[11px] text-slate-500 mt-3">
                      {lessonsDone}/{m.lessons.length} lessons
                      {quiz ? ` · quiz ${quiz.score}/${quiz.total}` : ''} · {m.labIds.length} labs
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="glass rounded-2xl p-6 text-sm text-slate-300 space-y-2">
        <h2 className="text-white font-semibold">How labs work</h2>
        <p>
          Every lab talks to a <code className="text-cyan-300">LabProvider</code>. Default is{' '}
          <strong>simulated</strong> (in-browser). Set <code className="text-cyan-300">VITE_LAB_MODE=real</code>{' '}
          and implement stubs in <code className="text-cyan-300">src/labs/providers/real</code> to point at real
          tooling later.
        </p>
      </section>
    </div>
  )
}
