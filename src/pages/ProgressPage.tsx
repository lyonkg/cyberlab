import { MODULES, totalLabCount, totalLessonCount, totalQuizCount } from '../data/modules'
import { progressPercent } from '../lib/progress'
import { useProgress } from '../hooks/useProgress'
import { LAB_TITLES } from '../labs/titles'
import { PercentBar } from '../components/PercentBar'

export function ProgressPage() {
  const { progress, reset } = useProgress()
  const pct = progressPercent(totalLessonCount(), totalLabCount(), totalQuizCount())

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Progress</h1>
          <p className="text-slate-400 text-sm mt-1">Stored locally in your browser (localStorage).</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm('Reset all progress?')) reset()
          }}
          className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-300 text-sm"
        >
          Reset progress
        </button>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-300">Overall</span>
          <span className="text-cyan-300 font-semibold">{pct}%</span>
        </div>
        <PercentBar value={pct} heightClass="h-3" />

        <div className="grid grid-cols-3 gap-3 mt-4 text-center text-sm">
          <Stat label="Lessons" value={`${progress.completedLessons.length}/${totalLessonCount()}`} />
          <Stat label="Labs" value={`${progress.completedLabs.length}/${totalLabCount()}`} />
          <Stat
            label="Quizzes"
            value={`${Object.keys(progress.quizScores).length}/${totalQuizCount()}`}
          />
        </div>
      </div>

      <div className="space-y-3">
        {MODULES.map((m) => {
          const quiz = progress.quizScores[m.id]
          return (
            <div key={m.id} className="glass rounded-xl p-4">
              <h2 className="font-medium text-white">{m.title}</h2>
              <p className="text-xs text-slate-400 mt-1">
                Lessons:{' '}
                {m.lessons.filter((l) => progress.completedLessons.includes(l.id)).length}/
                {m.lessons.length}
                {quiz ? ` · Quiz ${quiz.score}/${quiz.total}` : ' · Quiz not taken'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Labs:{' '}
                {m.labIds
                  .map((id) => `${LAB_TITLES[id] ?? id}${progress.completedLabs.includes(id) ? '✓' : ''}`)
                  .join(' · ')}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-900/60 p-3">
      <p className="text-slate-500 text-xs">{label}</p>
      <p className="text-white font-semibold mt-0.5">{value}</p>
    </div>
  )
}
