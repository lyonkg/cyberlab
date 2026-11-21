import type { ModuleMeta } from '../../types'

export const DEFENSE_MODULE: ModuleMeta = {
    id: 'defense',
    title: 'Defense Basics',
    shortTitle: 'Defense',
    description:
      'Password strength, MFA, patching, least privilege, and defense in depth — practical habits that compound.',
    icon: 'Shield',
    path: '/modules/defense',
    color: 'sky',
    labIds: ['password', 'defense-depth'],
    lessons: [
      {
        id: 'def-intro',
        title: 'Defense in depth',
        content:
          'No single control is perfect. Layer preventive, detective, and responsive controls: strong auth, patching, least privilege, network segmentation, logging/monitoring, and backups.',
      },
      {
        id: 'def-auth',
        title: 'Authentication hygiene',
        content:
          'Long unique passwords (or a password manager), MFA everywhere possible, and phishing-resistant factors (security keys) dramatically reduce account takeover risk.',
      },
      {
        id: 'def-patch',
        title: 'Patch & privilege',
        content:
          'Unpatched software is a top breach vector. Apply updates promptly. Grant the minimum permissions needed for each role — least privilege limits damage when something slips through.',
      },
    ],
    quiz: [
      {
        id: 'defq1',
        prompt: 'MFA primarily helps by:',
        choices: [
          'Making passwords unnecessary forever',
          'Requiring a second factor if the password is stolen',
          'Encrypting the hard drive',
          'Blocking DDoS',
        ],
        correctIndex: 1,
        explanation: 'Stolen passwords alone are often not enough when MFA is enforced.',
      },
      {
        id: 'defq2',
        prompt: 'Least privilege means:',
        choices: [
          'Everyone gets admin “just in case”',
          'Accounts get only the access required for their job',
          'Disabling all firewalls',
          'Sharing one root password',
        ],
        correctIndex: 1,
        explanation: 'Minimize access to minimize blast radius.',
      },
      {
        id: 'defq3',
        prompt: 'Defense in depth means:',
        choices: [
          'Relying on a single perfect control',
          'Layering multiple complementary controls',
          'Only using antivirus',
          'Never connecting to the internet',
        ],
        correctIndex: 1,
        explanation: 'Overlapping controls catch failures of any one layer.',
      },
    ]
}
