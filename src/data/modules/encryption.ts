import type { ModuleMeta } from '../../types'

export const ENCRYPTION_MODULE: ModuleMeta = {
    id: 'encryption',
    title: 'Chiffrement et hachage',
    shortTitle: 'Chiffrement',
    description:
      'Chiffrements classiques, cryptographie symétrique et asymétrique, démos AES avec Web Crypto et hachage avec sel.',
    icon: 'Lock',
    path: '/modules/encryption',
    color: 'violet',
    labIds: ['caesar', 'aes', 'hashing'],
    lessons: [
      {
        id: 'enc-intro',
        title: 'Confidentialité, intégrité, authenticité',
        content:
          'Le chiffrement protège la confidentialité. Le hachage permet de vérifier l’intégrité. Les signatures numériques et les MAC garantissent l’authenticité. Les vrais systèmes combinent ces briques avec soin.',
      },
      {
        id: 'enc-sym-asym',
        title: 'Symétrique ou asymétrique',
        content:
          'La cryptographie symétrique (AES) utilise une seule clé partagée : rapide, idéale pour de gros volumes. La cryptographie asymétrique (RSA, ECC) utilise des paires de clés : plus lente, idéale pour l’échange de clés et les signatures. TLS utilise les deux.',
      },
      {
        id: 'enc-kdf',
        title: 'Transformer une phrase secrète en clé',
        content:
          'Une phrase secrète humaine n’est pas une clé. Utilisez une fonction de dérivation de clé comme PBKDF2 (des centaines de milliers d’itérations), scrypt ou Argon2 avec un salt aléatoire pour l’étirer en clé de 256 bits : deviner devient lent et deux phrases identiques donnent des clés différentes. AES-GCM exige ensuite un IV (nonce) aléatoire unique de 12 octets par message — réutiliser un IV avec la même clé casse GCM. Le salt et l’IV sont publics et stockés avec le texte chiffré ; seule la phrase secrète est secrète.',
      },
      {
        id: 'enc-hash',
        title: 'Hachage et salage',
        content:
          'Un hash cryptographique est à sens unique. Pour les mots de passe, ajoutez toujours un salt (aléatoire et unique par utilisateur) et utilisez une KDF lente (bcrypt/scrypt/Argon2). Ne stockez jamais un mot de passe en clair ni son SHA-256 sans salt.',
      },
    ],
    quiz: [
      {
        id: 'eq1',
        prompt: 'AES est un exemple de :',
        choices: ['Chiffrement asymétrique', 'Chiffrement symétrique', 'Algorithme de hachage', 'Pare-feu'],
        correctIndex: 1,
        explanation: 'AES utilise la même clé secrète pour chiffrer et déchiffrer.',
      },
      {
        id: 'eq2',
        prompt: 'Pourquoi saler les hash de mots de passe ?',
        choices: [
          'Pour raccourcir les hash',
          'Pour que des mots de passe identiques ne donnent pas le même hash / contrer les rainbow tables',
          'Pour chiffrer le mot de passe de façon réversible',
          'Pour accélérer la connexion',
        ],
        correctIndex: 1,
        explanation: 'Avec un salt unique, les rainbow tables précalculées ne permettent plus de retrouver hash → mot de passe d’un utilisateur à l’autre.',
      },
      {
        id: 'eq4',
        prompt: 'Pour chiffrer avec une phrase secrète en AES-GCM, quelle méthode est correcte ?',
        choices: [
          'Utiliser directement les octets de la phrase comme clé, avec un IV fixe',
          'Dériver la clé avec PBKDF2/Argon2 et un salt aléatoire, et utiliser un nouvel IV aléatoire par message',
          'Garder l’IV secret et le réutiliser pour gagner de la place',
          'Hacher la phrase une seule fois en MD5',
        ],
        correctIndex: 1,
        explanation: 'Une KDF lente avec salt résiste aux essais ; un IV unique par message est indispensable à la sécurité de GCM. Le salt et l’IV peuvent être stockés en clair.',
      },
      {
        id: 'eq3',
        prompt: 'Aujourd’hui, la sécurité du chiffrement de César est :',
        choices: ['De niveau militaire', 'Cassée par une force brute triviale (26 clés)', 'Résistante au quantique', 'Utilisée dans TLS 1.3'],
        correctIndex: 1,
        explanation: 'Seulement 26 décalages : utile pour apprendre, inutile pour un vrai secret.',
      },
    ],
}
