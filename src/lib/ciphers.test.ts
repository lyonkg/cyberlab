import { describe, expect, it } from 'vitest'
import {
  caesarDecrypt,
  caesarEncrypt,
  crackCaesar,
  englishScore,
  vigenereDecrypt,
  vigenereEncrypt,
} from './ciphers'

describe('caesar', () => {
  it('encrypts and decrypts round-trip', () => {
    const plain = 'Hello, World!'
    const cipher = caesarEncrypt(plain, 5)
    expect(cipher).toBe('Mjqqt, Btwqi!')
    expect(caesarDecrypt(cipher, 5)).toBe(plain)
  })

  it('wraps negative shifts', () => {
    expect(caesarDecrypt('B', 1)).toBe('A')
  })
})

describe('vigenere', () => {
  it('encrypts with classic LEMON key', () => {
    expect(vigenereEncrypt('ATTACKATDAWN', 'LEMON')).toBe('LXFOPVEFRNHR')
  })

  it('decrypts round-trip', () => {
    const plain = 'CyberSecurity'
    const key = 'KEY'
    expect(vigenereDecrypt(vigenereEncrypt(plain, key), key)).toBe(plain)
  })
})

describe('crackCaesar', () => {
  it('ranks correct shift highly for English text', () => {
    const plain = 'The quick brown fox jumps over the lazy dog'
    const cipher = caesarEncrypt(plain, 7)
    const ranked = crackCaesar(cipher)
    expect(ranked[0].shift).toBe(7)
    expect(englishScore(plain)).toBeGreaterThan(englishScore(cipher))
  })
})
