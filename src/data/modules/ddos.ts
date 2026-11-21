import type { ModuleMeta } from '../../types'

export const DDOS_MODULE: ModuleMeta = {
    id: 'ddos',
    title: 'Attaques DDoS',
    shortTitle: 'DDoS',
    description: 'Simulation de trafic en direct avec limitation de débit et protection de type CDN activables.',
    icon: 'Activity',
    path: '/modules/ddos',
    color: 'orange',
    labIds: ['ddos-sim'],
    lessons: [
      {
        id: 'ddos-intro',
        title: 'Saturer la disponibilité',
        content:
          'Un déni de service distribué (DDoS) inonde une cible de trafic ou de requêtes pour que les utilisateurs légitimes ne soient plus servis. Les attaques volumétriques, protocolaires et applicatives en sont les grandes familles.',
      },
      {
        id: 'ddos-mitigation',
        title: 'Contre-mesures',
        content:
          'Limitation de débit (rate limiting), absorption par anycast/CDN, SYN cookies, défis anti-bots et filtrage en amont réduisent l’impact. Le dimensionnement seul suffit rarement face à de grands botnets.',
      },
    ],
    quiz: [
      {
        id: 'dq1',
        prompt: 'Quelle propriété de sécurité un DDoS vise-t-il d’abord ?',
        choices: ['Confidentialité', 'Intégrité', 'Disponibilité', 'Non-répudiation'],
        correctIndex: 2,
        explanation: 'Le « D » de la triade DIC (CIA en anglais) : rendre le service indisponible ou inutilisable.',
      },
      {
        id: 'dq2',
        prompt: 'Un CDN aide contre un DDoS volumétrique surtout en :',
        choices: [
          'Stockant les mots de passe',
          'Absorbant et répartissant le trafic sur de nombreux nœuds en périphérie',
          'Désactivant TCP',
          'Rendant TLS inutile',
        ],
        correctIndex: 1,
        explanation: 'L’anycast/CDN répartit la charge : aucun serveur d’origine n’est submergé aussi facilement.',
      },
    ],
}
