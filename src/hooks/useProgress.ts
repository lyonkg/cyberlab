import { useCallback, useEffect, useState } from 'react'
import {
  loadProgress,
  markLabComplete,
  markLessonComplete,
  resetProgress,
  saveQuizScore,
  setLastVisited,
} from '../lib/progress'
import type { ProgressState } from '../types'

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())

  useEffect(() => {
    const onStorage = () => setProgress(loadProgress())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const refresh = useCallback(() => setProgress(loadProgress()), [])

  return {
    progress,
    refresh,
    completeLesson: (id: string) => {
      setProgress(markLessonComplete(id))
    },
    completeLab: (id: string) => {
      setProgress(markLabComplete(id))
    },
    recordQuiz: (moduleId: string, score: number, total: number) => {
      setProgress(saveQuizScore(moduleId, score, total))
    },
    visit: (path: string) => {
      setProgress(setLastVisited(path))
    },
    reset: () => setProgress(resetProgress()),
  }
}
