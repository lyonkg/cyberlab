import type { ModuleMeta } from '../../types'

export const PHISHING_MODULE: ModuleMeta = {
    id: 'phishing',
    title: 'Phishing Attacks',
    shortTitle: 'Phishing',
    description: 'Spot malicious emails: spoofed senders, urgent language, lookalike domains, and shady links.',
    icon: 'Mail',
    path: '/modules/phishing',
    color: 'amber',
    labIds: ['spot-phish'],
    lessons: [
      {
        id: 'phish-intro',
        title: 'Social engineering 101',
        content:
          'Phishing tricks humans, not protocols. Attackers impersonate trusted brands or coworkers, create urgency, and lure victims to fake login pages or malware downloads.',
      },
      {
        id: 'phish-signals',
        title: 'Red flags',
        content:
          'Look for: mismatched display name vs address, lookalike domains (rnicrosoft.com), unexpected attachments, urgency/threats, links that go elsewhere than the visible text, and requests for secrets via email.',
      },
    ],
    quiz: [
      {
        id: 'pq1',
        prompt: 'Hovering a link before clicking helps you:',
        choices: [
          'Encrypt the email',
          'See the real destination URL',
          'Disable JavaScript',
          'Update your antivirus',
        ],
        correctIndex: 1,
        explanation: 'The status bar / tooltip shows where the link actually goes.',
      },
      {
        id: 'pq2',
        prompt: 'A lookalike domain is dangerous because:',
        choices: [
          'It is always blocked by DNS',
          'It can visually trick users into trusting a fake site',
          'It uses AES',
          'It only works on mobile',
        ],
        correctIndex: 1,
        explanation: 'Slight character changes (0/O, rn/m) fool quick glances.',
      },
    ],
}
