import type { ModuleMeta } from '../../types'

export const MITM_MODULE: ModuleMeta = {
    id: 'mitm',
    title: 'Attaque de l’homme du milieu (MITM)',
    shortTitle: 'MITM',
    description: 'Alice, Bob et Mallory : voyez ce qui se passe en HTTP et en HTTPS.',
    icon: 'Eye',
    path: '/modules/mitm',
    color: 'fuchsia',
    labIds: ['mitm-anim'],
    lessons: [
      {
        id: 'mitm-intro',
        title: 'Se placer au milieu',
        content:
          'Un attaquant MITM intercepte la communication entre deux parties. Sur un Wi-Fi ouvert ou un routeur compromis, le HTTP en clair peut être lu ou modifié. TLS (HTTPS) authentifie le serveur et chiffre le canal.',
      },
      {
        id: 'mitm-tls',
        title: 'Comment TLS protège',
        content:
          'Les certificats lient une clé publique à un domaine (validés par des autorités de certification). Le client vérifie la chaîne de certificats et le nom d’hôte. Les sessions chiffrées empêchent l’écoute passive ; la vérification des certificats bloque de nombreuses usurpations actives.',
      },
    ],
    quiz: [
      {
        id: 'mitmq1',
        prompt: 'En HTTP simple, un MITM sur le réseau peut généralement :',
        choices: [
          'Voir seulement les métadonnées, jamais le contenu',
          'Lire et modifier le contenu des requêtes et des réponses',
          'Rien — HTTP est chiffré de bout en bout',
          'Attaquer uniquement UDP',
        ],
        correctIndex: 1,
        explanation: 'HTTP circule en clair sur le réseau.',
      },
      {
        id: 'mitmq2',
        prompt: 'HTTPS utilise des certificats surtout pour :',
        choices: [
          'Compresser les images',
          'Authentifier le serveur (et permettre des clés de session chiffrées)',
          'Bloquer toutes les publicités',
          'Remplacer les mots de passe',
        ],
        correctIndex: 1,
        explanation: 'Le certificat prouve que vous parlez au vrai serveur avant de dériver les clés de session.',
      },
    ],
}
