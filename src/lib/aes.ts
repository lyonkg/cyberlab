/**
 * AES-256-GCM with a PBKDF2-SHA-256 derived key (Web Crypto).
 * Envelope: base64( salt[16] ‖ iv[12] ‖ ciphertext+tag )
 */

import { LIMITS } from './validation'

export const PBKDF2_ITERATIONS = 600_000 // OWASP 2023+ recommendation for PBKDF2-HMAC-SHA256
export const SALT_BYTES = 16
export const IV_BYTES = 12

export interface AesEnvelope {
  saltHex: string
  ivHex: string
  iterations: number
  ciphertextB64: string
  /** salt ‖ iv ‖ ciphertext, base64 — everything needed (plus passphrase) to decrypt */
  packedB64: string
}

export const toHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('')

function toB64(b: Uint8Array): string {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s)
}

function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptAesGcm(
  plaintext: string,
  passphrase: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<AesEnvelope> {
  if (plaintext.length > LIMITS.aesPlain) throw new Error('texte en clair trop long')
  if (passphrase.length > LIMITS.passphrase) throw new Error('phrase secrète trop longue')
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(passphrase, salt, iterations)
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)),
  )
  const packed = new Uint8Array(salt.length + iv.length + ct.length)
  packed.set(salt, 0)
  packed.set(iv, salt.length)
  packed.set(ct, salt.length + iv.length)
  return {
    saltHex: toHex(salt),
    ivHex: toHex(iv),
    iterations,
    ciphertextB64: toB64(ct),
    packedB64: toB64(packed),
  }
}

export async function decryptAesGcm(
  packedB64: string,
  passphrase: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<string> {
  if (packedB64.length > 24_000) throw new Error('texte chiffré trop long')
  if (passphrase.length > LIMITS.passphrase) throw new Error('phrase secrète trop longue')
  const raw = fromB64(packedB64)
  if (raw.length < SALT_BYTES + IV_BYTES + 16) throw new Error('texte chiffré trop court')
  const salt = raw.slice(0, SALT_BYTES)
  const iv = raw.slice(SALT_BYTES, SALT_BYTES + IV_BYTES)
  const data = raw.slice(SALT_BYTES + IV_BYTES)
  const key = await deriveKey(passphrase, salt, iterations)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return new TextDecoder().decode(plain)
}
