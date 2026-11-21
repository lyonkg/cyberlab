import type { ModuleMeta } from '../../types'

export const ENCRYPTION_MODULE: ModuleMeta = {
    id: 'encryption',
    title: 'Encryption & Hashing',
    shortTitle: 'Encryption',
    description:
      'Classical ciphers, symmetric vs asymmetric crypto, Web Crypto AES demos, and hashing with salts.',
    icon: 'Lock',
    path: '/modules/encryption',
    color: 'violet',
    labIds: ['caesar', 'aes', 'hashing'],
    lessons: [
      {
        id: 'enc-intro',
        title: 'Confidentiality, integrity, authenticity',
        content:
          'Encryption protects confidentiality. Hashing supports integrity checks. Digital signatures and MACs provide authenticity. Real systems combine these primitives carefully.',
      },
      {
        id: 'enc-sym-asym',
        title: 'Symmetric vs asymmetric',
        content:
          'Symmetric crypto (AES) uses one shared key — fast, great for bulk data. Asymmetric crypto (RSA, ECC) uses key pairs — slower, great for key exchange and signatures. TLS uses both.',
      },
      {
        id: 'enc-kdf',
        title: 'Turning passphrases into keys',
        content:
          'A human passphrase is not a key. Use a key-derivation function such as PBKDF2 (hundreds of thousands of iterations), scrypt, or Argon2 with a random salt to stretch it into a 256-bit key, so guessing is slow and identical passphrases yield different keys. AES-GCM then needs a unique random 12-byte IV (nonce) per message — reusing an IV with the same key breaks GCM. Salt and IV are public and stored with the ciphertext; only the passphrase is secret.',
      },
      {
        id: 'enc-hash',
        title: 'Hashing & salting',
        content:
          'A cryptographic hash is one-way. For passwords, always salt (unique random per user) and use a slow KDF (bcrypt/scrypt/Argon2). Never store plaintext or unsalted SHA-256 of passwords.',
      },
    ],
    quiz: [
      {
        id: 'eq1',
        prompt: 'AES is an example of:',
        choices: ['Asymmetric encryption', 'Symmetric encryption', 'A hashing algorithm', 'A firewall'],
        correctIndex: 1,
        explanation: 'AES uses the same secret key to encrypt and decrypt.',
      },
      {
        id: 'eq2',
        prompt: 'Why salt password hashes?',
        choices: [
          'To make hashes shorter',
          'To prevent identical passwords from producing identical hashes / defeat rainbow tables',
          'To encrypt the password reversibly',
          'To speed up login',
        ],
        correctIndex: 1,
        explanation: 'Unique salts mean precomputed rainbow tables no longer map hash→password across users.',
      },
      {
        id: 'eq4',
        prompt: 'When encrypting with a passphrase using AES-GCM, which is correct?',
        choices: [
          'Use the passphrase bytes directly as the key and a fixed IV',
          'Derive the key with PBKDF2/Argon2 and a random salt, and use a fresh random IV per message',
          'Keep the IV secret and reuse it to save space',
          'Hash the passphrase once with MD5',
        ],
        correctIndex: 1,
        explanation: 'A slow salted KDF resists guessing; a unique IV per message is required for GCM security. Salt and IV can be stored in the clear.',
      },
      {
        id: 'eq3',
        prompt: 'Caesar cipher security today is:',
        choices: ['Military-grade', 'Broken by trivial brute force (26 keys)', 'Quantum-resistant', 'Used in TLS 1.3'],
        correctIndex: 1,
        explanation: 'Only 26 shifts — useful for teaching, useless for real secrecy.',
      },
    ],
}
