import type { ProgressState } from '../types'
import { LIMITS, clampInt, isAppPath, isProgressId } from './validation'

const KEY = 'cyberlab-progress-v1'

const EMPTY: ProgressState = {
  completedLessons: [],
  completedLabs: [],
  quizScores: {},
}

function emptyProgress(): ProgressState {
  return { completedLessons: [], completedLabs: [], quizScores: {} }
}

function uniqueIds(values: unknown, max = LIMITS.progressList): string[] {
  if (!Array.isArray(values)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const v of values) {
    if (!isProgressId(v) || seen.has(v)) continue
    seen.add(v)
    out.push(v)
    if (out.length >= max) break
  }
  return out
}

function parseQuizScores(raw: unknown): ProgressState['quizScores'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: ProgressState['quizScores'] = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isProgressId(key) || !value || typeof value !== 'object' || Array.isArray(value)) continue
    const rec = value as Record<string, unknown>
    const score = clampInt(rec.score, 0, LIMITS.quizScore, 0)
    const total = clampInt(rec.total, 0, LIMITS.quizScore, 0)
    const at = typeof rec.at === 'string' && rec.at.length <= 64 && !Number.isNaN(Date.parse(rec.at))
      ? rec.at
      : new Date(0).toISOString()
    out[key] = { score, total, at }
    if (Object.keys(out).length >= LIMITS.progressList) break
  }
  return out
}

/** Parse and validate a localStorage payload. Invalid or oversized data is dropped. */
export function parseProgressState(raw: string | null | undefined): ProgressState {
  if (!raw || raw.length > LIMITS.progressJson) return emptyProgress()
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return emptyProgress()
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyProgress()
  const obj = parsed as Record<string, unknown>
  const lastVisited = isAppPath(obj.lastVisited) ? obj.lastVisited : undefined
  return {
    completedLessons: uniqueIds(obj.completedLessons),
    completedLabs: uniqueIds(obj.completedLabs),
    quizScores: parseQuizScores(obj.quizScores),
    lastVisited,
  }
}

export function loadProgress(): ProgressState {
  try {
    return parseProgressState(localStorage.getItem(KEY))
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(state: ProgressState): void {
  try {
    const payload = JSON.stringify(state)
    if (payload.length > LIMITS.progressJson) return
    localStorage.setItem(KEY, payload)
  } catch {
    // QuotaExceeded or private-mode storage — keep the in-memory state only.
  }
}

export function markLessonComplete(lessonId: string): ProgressState {
  if (!isProgressId(lessonId)) return loadProgress()
  const p = loadProgress()
  if (!p.completedLessons.includes(lessonId)) {
    p.completedLessons = [...p.completedLessons, lessonId].slice(0, LIMITS.progressList)
    saveProgress(p)
  }
  return p
}

export function markLabComplete(labId: string): ProgressState {
  if (!isProgressId(labId)) return loadProgress()
  const p = loadProgress()
  if (!p.completedLabs.includes(labId)) {
    p.completedLabs = [...p.completedLabs, labId].slice(0, LIMITS.progressList)
    saveProgress(p)
  }
  return p
}

export function saveQuizScore(moduleId: string, score: number, total: number): ProgressState {
  if (!isProgressId(moduleId)) return loadProgress()
  const p = loadProgress()
  p.quizScores = {
    ...p.quizScores,
    [moduleId]: {
      score: clampInt(score, 0, LIMITS.quizScore, 0),
      total: clampInt(total, 0, LIMITS.quizScore, 0),
      at: new Date().toISOString(),
    },
  }
  saveProgress(p)
  return p
}

export function setLastVisited(path: string): ProgressState {
  const p = loadProgress()
  if (isAppPath(path)) {
    p.lastVisited = path
    saveProgress(p)
  }
  return p
}

export function resetProgress(): ProgressState {
  const empty = emptyProgress()
  saveProgress(empty)
  return empty
}

export function progressPercent(totalLessons: number, totalLabs: number, totalQuizzes: number): number {
  const p = loadProgress()
  const lessonPts = p.completedLessons.length
  const labPts = p.completedLabs.length
  const quizPts = Object.keys(p.quizScores).length
  const total = totalLessons + totalLabs + totalQuizzes
  if (total === 0) return 0
  return Math.min(100, Math.round(((lessonPts + labPts + quizPts) / total) * 100))
}

export { KEY as PROGRESS_STORAGE_KEY, EMPTY, emptyProgress }
