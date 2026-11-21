import { afterEach, describe, expect, it } from 'vitest'
import {
  PROGRESS_STORAGE_KEY,
  loadProgress,
  markLabComplete,
  markLessonComplete,
  parseProgressState,
  resetProgress,
  saveQuizScore,
  setLastVisited,
} from './progress'

describe('parseProgressState', () => {
  it('returns empty state for null, invalid JSON, or non-objects', () => {
    expect(parseProgressState(null).completedLessons).toEqual([])
    expect(parseProgressState('not-json').completedLabs).toEqual([])
    expect(parseProgressState('[]').quizScores).toEqual({})
    expect(parseProgressState('null').completedLessons).toEqual([])
  })

  it('keeps well-formed records', () => {
    const parsed = parseProgressState(
      JSON.stringify({
        completedLessons: ['intro-1', 'intro-1', '../x'],
        completedLabs: ['sqli-login'],
        quizScores: {
          network: { score: 3, total: 5, at: '2026-01-02T03:04:05.000Z' },
          'bad id': { score: 1, total: 1, at: '2026-01-02T03:04:05.000Z' },
        },
        lastVisited: '/modules/network',
      }),
    )
    expect(parsed.completedLessons).toEqual(['intro-1'])
    expect(parsed.completedLabs).toEqual(['sqli-login'])
    expect(parsed.quizScores.network).toEqual({
      score: 3,
      total: 5,
      at: '2026-01-02T03:04:05.000Z',
    })
    expect(parsed.quizScores['bad id']).toBeUndefined()
    expect(parsed.lastVisited).toBe('/modules/network')
  })

  it('drops oversized payloads and unsafe lastVisited values', () => {
    expect(parseProgressState('{"completedLessons":' + 'x'.repeat(40_000)).completedLessons).toEqual(
      [],
    )
    expect(
      parseProgressState(
        JSON.stringify({
          completedLessons: [],
          completedLabs: [],
          quizScores: {},
          lastVisited: 'javascript:alert(1)',
        }),
      ).lastVisited,
    ).toBeUndefined()
  })

  it('clamps quiz scores and ignores non-numeric values', () => {
    const parsed = parseProgressState(
      JSON.stringify({
        quizScores: { network: { score: -4, total: '3', at: 'not-a-date' } },
      }),
    )
    expect(parsed.quizScores.network?.score).toBe(0)
    expect(parsed.quizScores.network?.total).toBe(3)
    expect(parsed.quizScores.network?.at).toBe(new Date(0).toISOString())
  })
})

describe('progress localStorage helpers', () => {
  afterEach(() => {
    localStorage.removeItem(PROGRESS_STORAGE_KEY)
  })

  it('loads empty progress when nothing is stored', () => {
    expect(loadProgress().completedLessons).toEqual([])
  })

  it('records only valid ids and paths', () => {
    markLessonComplete('intro-1')
    markLessonComplete('../etc')
    markLabComplete('firewall')
    setLastVisited('/labs')
    setLastVisited('https://evil.example')
    const p = loadProgress()
    expect(p.completedLessons).toEqual(['intro-1'])
    expect(p.completedLabs).toEqual(['firewall'])
    expect(p.lastVisited).toBe('/labs')
  })

  it('saves a clamped quiz score and can reset', () => {
    saveQuizScore('network', 4, 5)
    expect(loadProgress().quizScores.network?.score).toBe(4)
    resetProgress()
    expect(loadProgress().completedLessons).toEqual([])
    expect(loadProgress().quizScores).toEqual({})
  })
})
