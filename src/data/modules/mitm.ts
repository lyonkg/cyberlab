import type { ModuleMeta } from '../../types'

export const MITM_MODULE: ModuleMeta = {
    id: 'mitm',
    title: 'Man-in-the-Middle',
    shortTitle: 'MITM',
    description: 'Alice, Bob, and Mallory — see what happens on HTTP vs HTTPS.',
    icon: 'Eye',
    path: '/modules/mitm',
    color: 'fuchsia',
    labIds: ['mitm-anim'],
    lessons: [
      {
        id: 'mitm-intro',
        title: 'Sitting in the middle',
        content:
          'A MITM attacker intercepts communication between two parties. On open Wi-Fi or compromised routers, cleartext HTTP can be read or modified. TLS (HTTPS) authenticates the server and encrypts the channel.',
      },
      {
        id: 'mitm-tls',
        title: 'How TLS helps',
        content:
          'Certificates bind a public key to a domain (validated by CAs). Clients verify the cert chain and hostname. Encrypted sessions stop passive eavesdropping; cert checks stop many active impersonations.',
      },
    ],
    quiz: [
      {
        id: 'mitmq1',
        prompt: 'On plain HTTP, a network MITM can typically:',
        choices: [
          'Only see metadata, never bodies',
          'Read and modify request/response bodies',
          'Nothing — HTTP is end-to-end encrypted',
          'Only attack UDP',
        ],
        correctIndex: 1,
        explanation: 'HTTP is cleartext on the wire.',
      },
      {
        id: 'mitmq2',
        prompt: 'HTTPS uses certificates primarily to:',
        choices: [
          'Compress images',
          'Authenticate the server (and enable encrypted session keys)',
          'Block all ads',
          'Replace passwords',
        ],
        correctIndex: 1,
        explanation: 'Certs prove you are talking to the real server before deriving session keys.',
      },
    ],
}
