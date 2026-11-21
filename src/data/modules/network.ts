import type { ModuleMeta } from '../../types'

export const NETWORK_MODULE: ModuleMeta = {
    id: 'network',
    title: 'Sécurité réseau',
    shortTitle: 'Réseau',
    description:
      'Topologie, pare-feu, flux de paquets et handshake TCP : voyez comment les paquets circulent et comment les règles les bloquent (ou les laissent passer).',
    icon: 'Network',
    path: '/modules/network',
    color: 'cyan',
    labIds: ['topology', 'firewall', 'packet-flow', 'tcp-handshake'],
    lessons: [
      {
        id: 'network-intro',
        title: 'Pourquoi la sécurité réseau est essentielle',
        content:
          'Chaque service que vous utilisez repose sur des paquets qui traversent des réseaux non fiables. La sécurité réseau contrôle qui peut parler à qui, sur quels ports et avec quels protocoles. Pare-feu, segmentation et transports chiffrés forment la première ligne de défense.',
      },
      {
        id: 'network-osi',
        title: 'Les couches en pratique',
        content:
          'Raisonnez en couches : liens physiques, routage IP, sessions TCP/UDP et protocoles applicatifs (HTTP, DNS, SSH). Attaques et défenses visent souvent une couche précise : comprendre la pile aide à placer les contrôles au bon endroit.',
      },
      {
        id: 'network-firewall',
        title: 'Les bases du pare-feu',
        content:
          'Un pare-feu évalue chaque paquet selon des règles ordonnées (autoriser/refuser). La première règle qui correspond l’emporte ; le trafic sans correspondance est généralement refusé par défaut. De bonnes règles sont précises : moindre privilège, autorisation explicite des services nécessaires, refus du reste.',
      },
    ],
    quiz: [
      {
        id: 'nq1',
        prompt: 'Dans un pare-feu classique « première correspondance », que se passe-t-il si aucune règle ne correspond ?',
        choices: ['Le paquet est autorisé', 'Le paquet est refusé (refus par défaut)', 'On demande à l’utilisateur', 'Il est transmis au DNS'],
        correctIndex: 1,
        explanation: 'Le refus par défaut (default deny) est la base sûre : seul le trafic explicitement autorisé passe.',
      },
      {
        id: 'nq2',
        prompt: 'Quelle étape du handshake TCP le serveur envoie-t-il en premier ?',
        choices: ['ACK', 'FIN', 'SYN-ACK', 'RST'],
        correctIndex: 2,
        explanation: 'SYN du client → SYN-ACK du serveur → ACK du client : la poignée de main en trois temps est terminée.',
      },
      {
        id: 'nq3',
        prompt: 'Le port 443 est généralement associé à :',
        choices: ['HTTP non chiffré', 'SSH', 'HTTPS/TLS', 'SMTP'],
        correctIndex: 2,
        explanation: 'HTTPS utilise TLS, en général sur le port TCP 443.',
      },
    ],
}
