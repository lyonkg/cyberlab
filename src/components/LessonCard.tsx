import { Check } from 'lucide-react'
import type { LessonSection } from '../types'

interface Props {
  lesson: LessonSection
  completed: boolean
  onComplete: () => void
}

export function LessonCard({ lesson, completed, onComplete }: Props) {
  return (
    <article className="glass rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-lg font-semibold text-white">{lesson.title}</h3>
        {completed && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-300 bg-emerald-400/10 px-2 py-1 rounded-full">
            <Check className="h-3 w-3" /> Done
          </span>
        )}
      </div>
      <div className="prose-lesson text-sm">
        <p>{lesson.content}</p>
      </div>
      {!completed && (
        <button
          type="button"
          onClick={onComplete}
          className="mt-4 text-sm px-3 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-400/10"
        >
          Mark as read
        </button>
      )}
    </article>
  )
}
