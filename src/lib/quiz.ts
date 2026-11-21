import type { QuizQuestion } from '../types'

export interface QuizAnswer {
  questionId: string
  selectedIndex: number
}

export interface QuizResult {
  score: number
  total: number
  percent: number
  details: {
    questionId: string
    correct: boolean
    selectedIndex: number
    correctIndex: number
    explanation: string
  }[]
}

export function scoreQuiz(questions: QuizQuestion[], answers: QuizAnswer[]): QuizResult {
  const byId = new Map(answers.map((a) => [a.questionId, a.selectedIndex]))
  const details = questions.map((q) => {
    const selectedIndex = byId.has(q.id) ? (byId.get(q.id) as number) : -1
    const correct = selectedIndex === q.correctIndex
    return {
      questionId: q.id,
      correct,
      selectedIndex,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    }
  })
  const score = details.filter((d) => d.correct).length
  const total = questions.length
  return {
    score,
    total,
    percent: total === 0 ? 0 : Math.round((score / total) * 100),
    details,
  }
}
