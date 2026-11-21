import type { ModuleMeta } from '../../types'

export const DDOS_MODULE: ModuleMeta = {
    id: 'ddos',
    title: 'DDoS Attacks',
    shortTitle: 'DDoS',
    description: 'Live traffic simulation with rate limiting and CDN-style mitigation toggles.',
    icon: 'Activity',
    path: '/modules/ddos',
    color: 'orange',
    labIds: ['ddos-sim'],
    lessons: [
      {
        id: 'ddos-intro',
        title: 'Overwhelming availability',
        content:
          'Distributed Denial of Service floods a target with traffic or requests so legitimate users cannot get service. Volumetric, protocol, and application-layer floods are common classes.',
      },
      {
        id: 'ddos-mitigation',
        title: 'Mitigations',
        content:
          'Rate limiting, anycast/CDN absorption, SYN cookies, bot challenges, and upstream filtering reduce impact. Capacity planning alone is rarely enough against large botnets.',
      },
    ],
    quiz: [
      {
        id: 'dq1',
        prompt: 'DDoS primarily targets which security property?',
        choices: ['Confidentiality', 'Integrity', 'Availability', 'Non-repudiation'],
        correctIndex: 2,
        explanation: 'The “A” in CIA — keep the service down or unusable.',
      },
      {
        id: 'dq2',
        prompt: 'A CDN helps against volumetric DDoS mainly by:',
        choices: [
          'Storing passwords',
          'Absorbing and distributing traffic across many edge nodes',
          'Disabling TCP',
          'Removing the need for TLS',
        ],
        correctIndex: 1,
        explanation: 'Anycast/CDN spreads load so no single origin is overwhelmed as easily.',
      },
    ],
}
