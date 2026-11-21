import type { ModuleMeta } from '../../types'

export const NETWORK_MODULE: ModuleMeta = {
    id: 'network',
    title: 'Network Security',
    shortTitle: 'Network',
    description:
      'Topology, firewalls, packet flow, and the TCP handshake — see how packets move and how rules stop (or allow) them.',
    icon: 'Network',
    path: '/modules/network',
    color: 'cyan',
    labIds: ['topology', 'firewall', 'packet-flow', 'tcp-handshake'],
    lessons: [
      {
        id: 'network-intro',
        title: 'Why network security matters',
        content:
          'Every service you use rides on packets crossing untrusted networks. Network security controls who can talk to whom, on which ports, and under what protocols. Firewalls, segmentation, and encrypted transports form the first line of defense.',
      },
      {
        id: 'network-osi',
        title: 'Layers in practice',
        content:
          'Think in layers: physical links, IP routing, TCP/UDP sessions, and application protocols (HTTP, DNS, SSH). Attacks and defenses often target a specific layer — understanding the stack helps you place controls correctly.',
      },
      {
        id: 'network-firewall',
        title: 'Firewall basics',
        content:
          'A firewall evaluates packets against ordered rules (allow/deny). First match wins; unmatched traffic is usually denied by default. Good rules are specific: least privilege, explicit allow for needed services, deny the rest.',
      },
    ],
    quiz: [
      {
        id: 'nq1',
        prompt: 'In a typical first-match firewall, what happens if no rule matches?',
        choices: ['Allow the packet', 'Deny the packet (default deny)', 'Ask the user', 'Forward to DNS'],
        correctIndex: 1,
        explanation: 'Default-deny is the secure baseline: only explicitly allowed traffic passes.',
      },
      {
        id: 'nq2',
        prompt: 'Which TCP handshake step does the server send first?',
        choices: ['ACK', 'FIN', 'SYN-ACK', 'RST'],
        correctIndex: 2,
        explanation: 'Client SYN → Server SYN-ACK → Client ACK completes the three-way handshake.',
      },
      {
        id: 'nq3',
        prompt: 'Port 443 is commonly associated with:',
        choices: ['Unencrypted HTTP', 'SSH', 'HTTPS/TLS', 'SMTP'],
        correctIndex: 2,
        explanation: 'HTTPS uses TLS, typically on TCP port 443.',
      },
    ],
}
