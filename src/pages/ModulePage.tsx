import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LessonCard } from '../components/LessonCard'
import { Quiz } from '../components/Quiz'
import { getModule } from '../data/modules'
import { useProgress } from '../hooks/useProgress'
import { LabRenderer, LAB_TITLES } from '../labs/ui'

type Tab = 'lessons' | 'labs' | 'quiz'

export function ModulePage() {
  const { moduleId } = useParams()
  const mod = getModule(moduleId ?? '')
  const { progress, completeLesson, recordQuiz } = useProgress()
  const [tab, setTab] = useState<Tab>('lessons')
  const [labIndex, setLabIndex] = useState(0)

  const tabs = useMemo(
    () =>
      [
        { id: 'lessons' as const, label: 'Leçons' },
        { id: 'labs' as const, label: 'Labs' },
        { id: 'quiz' as const, label: 'Quiz' },
      ] as const,
    [],
  )

  if (!mod) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-300">Module introuvable.</p>
        <Link to="/" className="text-cyan-300 text-sm mt-2 inline-block">
          Retour à l’accueil
        </Link>
      </div>
    )
  }

  const activeLab = mod.labIds[labIndex]

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-xs text-slate-500 hover:text-cyan-300">
          ← Modules
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">{mod.title}</h1>
        <p className="text-slate-400 mt-2 max-w-2xl">{mod.description}</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-700 w-fit flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm ${
              tab === t.id ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'lessons' && (
        <div className="space-y-4">
          {mod.lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              completed={progress.completedLessons.includes(lesson.id)}
              onComplete={() => completeLesson(lesson.id)}
            />
          ))}
        </div>
      )}

      {tab === 'labs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {mod.labIds.map((id, i) => (
              <button
                key={id}
                type="button"
                onClick={() => setLabIndex(i)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  labIndex === i
                    ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200'
                    : 'border-slate-700 text-slate-400'
                }`}
              >
                {LAB_TITLES[id] ?? id}
                {progress.completedLabs.includes(id) ? ' ✓' : ''}
              </button>
            ))}
          </div>
          {activeLab && <LabRenderer labId={activeLab} />}
        </div>
      )}

      {tab === 'quiz' && (
        <Quiz
          moduleId={mod.id}
          questions={mod.quiz}
          onComplete={(score, total) => recordQuiz(mod.id, score, total)}
        />
      )}
    </div>
  )
}
