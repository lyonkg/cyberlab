import { LIMITS, clampInt, clampLength } from './validation'

/** Caesar cipher: shift each letter by `shift` (wraps A-Z / a-z). Non-letters unchanged. */
export function caesarEncrypt(text: string, shift: number): string {
  text = clampLength(text, LIMITS.cipherText)
  shift = clampInt(shift, -10_000, 10_000, 0)
  const s = ((shift % 26) + 26) % 26
  return text.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97
    return String.fromCharCode(((ch.charCodeAt(0) - base + s) % 26) + base)
  })
}

export function caesarDecrypt(text: string, shift: number): string {
  return caesarEncrypt(text, -shift)
}

/** Vigenère cipher using repeating alphabetic key. */
export function vigenereEncrypt(text: string, key: string): string {
  text = clampLength(text, LIMITS.cipherText)
  key = clampLength(key, LIMITS.cipherKey)
  const cleanKey = key.replace(/[^a-zA-Z]/g, '')
  if (!cleanKey) return text
  let ki = 0
  return text.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97
    const k = cleanKey[ki % cleanKey.length]
    const shift = k.toUpperCase().charCodeAt(0) - 65
    ki++
    return String.fromCharCode(((ch.charCodeAt(0) - base + shift) % 26) + base)
  })
}

export function vigenereDecrypt(text: string, key: string): string {
  text = clampLength(text, LIMITS.cipherText)
  key = clampLength(key, LIMITS.cipherKey)
  const cleanKey = key.replace(/[^a-zA-Z]/g, '')
  if (!cleanKey) return text
  let ki = 0
  return text.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97
    const k = cleanKey[ki % cleanKey.length]
    const shift = k.toUpperCase().charCodeAt(0) - 65
    ki++
    return String.fromCharCode(((ch.charCodeAt(0) - base - shift + 26) % 26) + base)
  })
}

/** Simple frequency heuristic: higher = more likely English-ish plaintext. */
export function englishScore(text: string): number {
  const freq: Record<string, number> = {
    e: 12.7, t: 9.1, a: 8.2, o: 7.5, i: 7.0, n: 6.7, s: 6.3, h: 6.1, r: 6.0,
  }
  const letters = text.toLowerCase().replace(/[^a-z]/g, '')
  if (!letters.length) return 0
  let score = 0
  for (const ch of letters) score += freq[ch] ?? 0.5
  return score / letters.length
}

export function crackCaesar(ciphertext: string): { shift: number; plaintext: string; score: number }[] {
  const results = []
  for (let shift = 0; shift < 26; shift++) {
    const plaintext = caesarDecrypt(ciphertext, shift)
    results.push({ shift, plaintext, score: englishScore(plaintext) })
  }
  return results.sort((a, b) => b.score - a.score)
}
