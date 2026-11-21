import { CheckCircle2, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { scoreQuiz } from '../lib/quiz'
import type { QuizQuestion } from '../types'

interface Props {
  moduleId: string
  questions: QuizQuestion[]
  onComplete?: (score: number, total: number) => void
}

export function Quiz({ moduleId, questions, onComplete }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const result = useMemo(() => {
    if (!submitted) return null
    return scoreQuiz(
      questions,
      Object.entries(answers).map(([questionId, selectedIndex]) => ({
        questionId,
        selectedIndex,
      })),
    )
  }, [submitted, answers, questions])

  const select = (qid: string, idx: number) => {
    if (submitted) return
    setAnswers((a) => ({ ...a, [qid]: idx }))
  }

  const submit = () => {
    setSubmitted(true)
    const r = scoreQuiz(
      questions,
      Object.entries(answers).map(([questionId, selectedIndex]) => ({
        questionId,
        selectedIndex,
      })),
    )
    onComplete?.(r.score, r.total)
  }

  const reset = () => {
    setAnswers({})
    setSubmitted(false)
  }

  return (
    <div className="space-y-4" data-testid={`quiz-${moduleId}`}>
      {questions.map((q, qi) => {
        const selected = answers[q.id]
        const detail = result?.details.find((d) => d.questionId === q.id)
        return (
          <div key={q.id} className="glass rounded-xl p-4">
            <p className="font-medium text-slate-100 mb-3">
              <span className="text-cyan-400 mr-2">{qi + 1}.</span>
              {q.prompt}
            </p>
            <div className="space-y-2">
              {q.choices.map((choice, idx) => {
                let cls =
                  'w-full text-left px-3 py-2 rounded-lg border text-sm transition '
                if (!submitted) {
                  cls +=
                    selected === idx
                      ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100'
                      : 'border-slate-700 hover:border-slate-500 text-slate-300'
                } else if (idx === q.correctIndex) {
                  cls += 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                } else if (selected === idx) {
                  cls += 'border-rose-500/60 bg-rose-500/10 text-rose-100'
                } else {
                  cls += 'border-slate-800 text-slate-500'
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    className={cls}
                    onClick={() => select(q.id, idx)}
                  >
                    {choice}
                  </button>
                )
              })}
            </div>
            {submitted && detail && (
              <div
                className={`mt-3 flex gap-2 text-sm ${
                  detail.correct ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {detail.correct ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <p>{q.explanation}</p>
              </div>
            )}
          </div>
        )
      })}

      <div className="flex flex-wrap items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            onClick={submit}
            disabled={Object.keys(answers).length < questions.length}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-sm disabled:opacity-40 hover:bg-cyan-400"
          >
            Check answers
          </button>
        ) : (
          <>
            <p className="text-sm text-slate-200">
              Score:{' '}
              <span className="font-bold text-cyan-300">
                {result?.score}/{result?.total}
              </span>{' '}
              ({result?.percent}%)
            </p>
            <button
              type="button"
              onClick={reset}
              className="px-3 py-2 rounded-lg border border-slate-600 text-sm hover:bg-slate-800"
            >
              Retry quiz
            </button>
          </>
        )}
      </div>
    </div>
  )
}
