import { describe, expect, it } from 'vitest'
import { checkPasswordStrength, estimateEntropy } from './password'

describe('checkPasswordStrength', () => {
  it('flags common weak passwords', () => {
    const r = checkPasswordStrength('password')
    expect(r.score).toBeLessThanOrEqual(1)
    expect(r.checks.find((c) => c.id === 'nocommon')?.passed).toBe(false)
  })

  it('rates a long complex password highly', () => {
    const r = checkPasswordStrength('Tr0ub4dor&3-extra-length!')
    expect(r.score).toBeGreaterThanOrEqual(3)
    expect(estimateEntropy('Tr0ub4dor&3-extra-length!')).toBeGreaterThan(50)
  })
})
