import { Link } from 'react-router-dom'
import { MODULES } from '../data/modules'
import { getLabProvider } from '../labs/providers'
import { LAB_TITLES } from '../labs/titles'
import { useProgress } from '../hooks/useProgress'

export function LabsOverviewPage() {
  const provider = getLabProvider()
  const { progress } = useProgress()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Hands-on Labs</h1>
        <p className="text-slate-400 mt-2 text-sm max-w-2xl">
          All labs run through the <strong className="text-slate-200">{provider.name}</strong> (
          {provider.mode}). {provider.description}
        </p>
      </div>

      <div className="space-y-4">
        {MODULES.map((m) => (
          <div key={m.id} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold text-white">{m.title}</h2>
              <Link to={m.path} className="text-xs text-cyan-300 hover:underline">
                Open module →
              </Link>
            </div>
            <ul className="grid sm:grid-cols-2 gap-2">
              {m.labIds.map((labId) => (
                <li key={labId}>
                  <Link
                    to={m.path}
                    className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/30"
                  >
                    <span className="text-slate-200">{LAB_TITLES[labId] ?? labId}</span>
                    <span className="text-[10px] text-slate-500">
                      {progress.completedLabs.includes(labId) ? 'completed' : 'open'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
