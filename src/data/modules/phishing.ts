import type { ModuleMeta } from '../../types'

export const PHISHING_MODULE: ModuleMeta = {
    id: 'phishing',
    title: 'Attaques de phishing',
    shortTitle: 'Phishing',
    description: 'Repérez les e-mails malveillants : expéditeurs usurpés, ton urgent, domaines sosies et liens douteux.',
    icon: 'Mail',
    path: '/modules/phishing',
    color: 'amber',
    labIds: ['spot-phish'],
    lessons: [
      {
        id: 'phish-intro',
        title: 'L’ingénierie sociale en bref',
        content:
          'Le phishing piège les humains, pas les protocoles. Les attaquants se font passer pour des marques ou des collègues de confiance, créent un sentiment d’urgence et attirent les victimes vers de fausses pages de connexion ou des téléchargements de malware.',
      },
      {
        id: 'phish-signals',
        title: 'Signaux d’alerte',
        content:
          'Repérez : un nom affiché qui ne correspond pas à l’adresse, des domaines sosies (rnicrosoft.com), des pièces jointes inattendues, l’urgence ou les menaces, des liens qui mènent ailleurs que le texte affiché, et les demandes de secrets par e-mail.',
      },
    ],
    quiz: [
      {
        id: 'pq1',
        prompt: 'Survoler un lien avant de cliquer permet de :',
        choices: [
          'Chiffrer l’e-mail',
          'Voir la véritable URL de destination',
          'Désactiver JavaScript',
          'Mettre à jour son antivirus',
        ],
        correctIndex: 1,
        explanation: 'La barre d’état ou l’infobulle montre où mène réellement le lien.',
      },
      {
        id: 'pq2',
        prompt: 'Un domaine sosie est dangereux parce que :',
        choices: [
          'Il est toujours bloqué par le DNS',
          'Il peut tromper visuellement l’utilisateur et lui faire croire à un site légitime',
          'Il utilise AES',
          'Il ne fonctionne que sur mobile',
        ],
        correctIndex: 1,
        explanation: 'De légers changements de caractères (0/O, rn/m) trompent un coup d’œil rapide.',
      },
    ],
}
