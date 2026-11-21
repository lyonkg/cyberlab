import { describe, expect, it } from 'vitest'
import { scoreQuiz } from './quiz'
import type { QuizQuestion } from '../types'

const questions: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'A?',
    choices: ['x', 'y'],
    correctIndex: 1,
    explanation: 'y',
  },
  {
    id: 'q2',
    prompt: 'B?',
    choices: ['a', 'b', 'c'],
    correctIndex: 0,
    explanation: 'a',
  },
]

describe('scoreQuiz', () => {
  it('scores all correct', () => {
    const r = scoreQuiz(questions, [
      { questionId: 'q1', selectedIndex: 1 },
      { questionId: 'q2', selectedIndex: 0 },
    ])
    expect(r.score).toBe(2)
    expect(r.percent).toBe(100)
  })

  it('scores partial and missing answers', () => {
    const r = scoreQuiz(questions, [{ questionId: 'q1', selectedIndex: 0 }])
    expect(r.score).toBe(0)
    expect(r.details[1].selectedIndex).toBe(-1)
    expect(r.percent).toBe(0)
  })
})
