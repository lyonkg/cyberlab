import type { ModuleMeta } from '../../types'

export const DEFENSE_MODULE: ModuleMeta = {
    id: 'defense',
    title: 'Bases de la défense',
    shortTitle: 'Défense',
    description:
      'Robustesse des mots de passe, MFA, correctifs, moindre privilège et défense en profondeur : des habitudes concrètes qui se cumulent.',
    icon: 'Shield',
    path: '/modules/defense',
    color: 'sky',
    labIds: ['password', 'defense-depth'],
    lessons: [
      {
        id: 'def-intro',
        title: 'La défense en profondeur',
        content:
          'Aucun contrôle n’est parfait. Superposez des contrôles préventifs, de détection et de réponse : authentification forte, correctifs, moindre privilège, segmentation réseau, journalisation/surveillance et sauvegardes.',
      },
      {
        id: 'def-auth',
        title: 'Hygiène d’authentification',
        content:
          'Des mots de passe longs et uniques (ou un gestionnaire de mots de passe), la MFA partout où c’est possible et des facteurs résistants au phishing (clés de sécurité) réduisent fortement le risque de prise de contrôle de compte.',
      },
      {
        id: 'def-patch',
        title: 'Correctifs et privilèges',
        content:
          'Les logiciels non corrigés sont l’une des premières causes de compromission. Appliquez les mises à jour rapidement. N’accordez que les permissions nécessaires à chaque rôle : le moindre privilège limite les dégâts quand quelque chose passe entre les mailles.',
      },
    ],
    quiz: [
      {
        id: 'defq1',
        prompt: 'La MFA aide surtout en :',
        choices: [
          'Rendant les mots de passe définitivement inutiles',
          'Exigeant un second facteur si le mot de passe est volé',
          'Chiffrant le disque dur',
          'Bloquant les DDoS',
        ],
        correctIndex: 1,
        explanation: 'Un mot de passe volé ne suffit souvent plus quand la MFA est imposée.',
      },
      {
        id: 'defq2',
        prompt: 'Le moindre privilège signifie :',
        choices: [
          'Tout le monde est admin « au cas où »',
          'Chaque compte n’a que les accès nécessaires à sa fonction',
          'Désactiver tous les pare-feu',
          'Partager un seul mot de passe root',
        ],
        correctIndex: 1,
        explanation: 'Réduire les accès, c’est réduire le rayon d’impact.',
      },
      {
        id: 'defq3',
        prompt: 'La défense en profondeur consiste à :',
        choices: [
          'Se reposer sur un seul contrôle parfait',
          'Superposer plusieurs contrôles complémentaires',
          'Utiliser uniquement un antivirus',
          'Ne jamais se connecter à Internet',
        ],
        correctIndex: 1,
        explanation: 'Des contrôles qui se recouvrent rattrapent la défaillance de n’importe quelle couche.',
      },
    ]
}
