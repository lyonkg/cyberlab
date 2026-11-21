import { useState } from 'react'
import { useProgress } from '../../hooks/useProgress'
import { isSafeHttpUrlForDisplay } from '../../lib/validation'

interface EmailSample {
  id: string
  fromName: string
  fromAddr: string
  subject: string
  body: string
  linkDisplay: string
  linkReal: string
  isPhish: boolean
  clues: string[]
}

const EMAILS: EmailSample[] = [
  {
    id: 'e1',
    fromName: 'PayPal Security',
    fromAddr: 'security@paypa1-secure.com',
    subject: 'Urgent: Confirm your account within 24 hours',
    body: 'We detected unusual activity. Click below to verify your identity or your account will be limited.',
    linkDisplay: 'https://www.paypal.com/verify',
    linkReal: 'https://paypa1-secure.com/login',
    isPhish: true,
    clues: ['Lookalike domain paypa1', 'Urgent threat language', 'Link text ≠ real URL'],
  },
  {
    id: 'e2',
    fromName: 'GitHub',
    fromAddr: 'noreply@github.com',
    subject: '[GitHub] A new public key was added to your account',
    body: 'A new SSH key was added. If this was you, no action is needed. Review your keys in Settings → SSH keys.',
    linkDisplay: 'https://github.com/settings/keys',
    linkReal: 'https://github.com/settings/keys',
    isPhish: false,
    clues: ['Legitimate domain', 'No credential ask', 'Link matches destination'],
  },
  {
    id: 'e3',
    fromName: 'IT Helpdesk',
    fromAddr: 'helpdesk@corprnail.com',
    subject: 'Password expire today - reset now',
    body: 'Your corporate password expires in 2 hours. Reset here immediately to avoid lockout.',
    linkDisplay: 'https://intranet.company.com/reset',
    linkReal: 'http://192.168.99.23/steal',
    isPhish: true,
    clues: ['Misspelled sender domain', 'Raw IP link', 'Artificial urgency'],
  },
]

export function PhishingLab() {
  const [idx, setIdx] = useState(0)
  const [guess, setGuess] = useState<boolean | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const { completeLab } = useProgress()
  const email = EMAILS[idx]

  const answer = (isPhish: boolean) => {
    if (guess !== null) return
    setGuess(isPhish)
    const correct = isPhish === email.isPhish
    setScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }))
    if (idx === EMAILS.length - 1) completeLab('spot-phish')
  }

  const next = () => {
    setGuess(null)
    setIdx((i) => (i + 1) % EMAILS.length)
  }

  return (
    <div className="space-y-4" data-testid="lab-phishing">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-white">Spot the Phish</h3>
        <span className="text-xs text-slate-400">
          Score {score.right}/{score.total} · Email {idx + 1}/{EMAILS.length}
        </span>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-700 text-sm space-y-1">
          <p>
            <span className="text-slate-500">From:</span>{' '}
            <span className="text-slate-200">
              {email.fromName} &lt;{email.fromAddr}&gt;
            </span>
          </p>
          <p>
            <span className="text-slate-500">Subject:</span>{' '}
            <span className="text-slate-200">{email.subject}</span>
          </p>
        </div>
        <div className="p-4 text-sm text-slate-300 space-y-3">
          <p>{email.body}</p>
          <p>
            {/* Rendered as a span so the teaching URL is never used as a navigable href. */}
            <span
              title={isSafeHttpUrlForDisplay(email.linkReal) ? email.linkReal : undefined}
              className="text-cyan-400 underline cursor-default"
            >
              {email.linkDisplay}
            </span>
            <span className="block text-[11px] text-slate-500 mt-1 font-mono">
              hover target → {isSafeHttpUrlForDisplay(email.linkReal) ? email.linkReal : '(blocked URL)'}
            </span>
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => answer(true)}
          disabled={guess !== null}
          className="px-4 py-2 rounded-lg bg-rose-500/80 text-white text-sm font-semibold disabled:opacity-40"
        >
          Phishing
        </button>
        <button
          type="button"
          onClick={() => answer(false)}
          disabled={guess !== null}
          className="px-4 py-2 rounded-lg bg-emerald-500/80 text-slate-950 text-sm font-semibold disabled:opacity-40"
        >
          Legitimate
        </button>
        {guess !== null && (
          <button
            type="button"
            onClick={next}
            className="px-4 py-2 rounded-lg border border-slate-600 text-sm"
          >
            Next email
          </button>
        )}
      </div>

      {guess !== null && (
        <div
          className={`rounded-xl p-4 text-sm ${
            guess === email.isPhish
              ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-100'
              : 'bg-rose-500/10 border border-rose-500/40 text-rose-100'
          }`}
        >
          <p className="font-semibold mb-1">
            {guess === email.isPhish ? 'Correct!' : 'Not quite.'} This is{' '}
            {email.isPhish ? 'phishing' : 'legitimate'}.
          </p>
          <ul className="list-disc list-inside text-slate-300">
            {email.clues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
