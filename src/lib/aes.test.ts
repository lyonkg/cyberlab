// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { IV_BYTES, PBKDF2_ITERATIONS, SALT_BYTES, decryptAesGcm, encryptAesGcm } from './aes'

// Fewer iterations keep tests fast; production default is exercised once below.
const IT = 1_000

describe('AES-GCM + PBKDF2', () => {
  it('round-trips with the right passphrase', async () => {
    const env = await encryptAesGcm('Top secret payload', 'correct horse', IT)
    expect(await decryptAesGcm(env.packedB64, 'correct horse', IT)).toBe('Top secret payload')
  })

  it('exposes random salt and IV of the right sizes', async () => {
    const a = await encryptAesGcm('same', 'pw', IT)
    const b = await encryptAesGcm('same', 'pw', IT)
    expect(a.saltHex).toHaveLength(SALT_BYTES * 2)
    expect(a.ivHex).toHaveLength(IV_BYTES * 2)
    expect(a.saltHex).not.toBe(b.saltHex)
    expect(a.ivHex).not.toBe(b.ivHex)
    expect(a.ciphertextB64).not.toBe(b.ciphertextB64)
  })

  it('fails with the wrong passphrase', async () => {
    const env = await encryptAesGcm('hello', 'right', IT)
    await expect(decryptAesGcm(env.packedB64, 'wrong', IT)).rejects.toThrow()
  })

  it('detects tampering (GCM auth tag)', async () => {
    const env = await encryptAesGcm('hello', 'pw', IT)
    const raw = Uint8Array.from(atob(env.packedB64), (c) => c.charCodeAt(0))
    raw[raw.length - 1] ^= 0x01
    const tampered = btoa(String.fromCharCode(...raw))
    await expect(decryptAesGcm(tampered, 'pw', IT)).rejects.toThrow()
  })

  it('uses a sensible default iteration count', async () => {
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000)
    const env = await encryptAesGcm('default', 'pw')
    expect(env.iterations).toBe(PBKDF2_ITERATIONS)
    expect(await decryptAesGcm(env.packedB64, 'pw')).toBe('default')
  })
})
