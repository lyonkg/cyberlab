import { LIMITS, clampLength } from './validation'

export interface PasswordStrength {
  score: number // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong'
  checks: { id: string; label: string; passed: boolean }[]
  entropyBits: number
}

export function estimateEntropy(password: string): number {
  password = clampLength(password, LIMITS.password)
  let pool = 0
  if (/[a-z]/.test(password)) pool += 26
  if (/[A-Z]/.test(password)) pool += 26
  if (/[0-9]/.test(password)) pool += 10
  if (/[^a-zA-Z0-9]/.test(password)) pool += 32
  if (pool === 0) return 0
  return Math.round(password.length * Math.log2(pool) * 10) / 10
}

export function checkPasswordStrength(password: string): PasswordStrength {
  password = clampLength(password, LIMITS.password)
  const checks = [
    { id: 'len8', label: 'At least 8 characters', passed: password.length >= 8 },
    { id: 'len12', label: 'At least 12 characters', passed: password.length >= 12 },
    { id: 'lower', label: 'Contains lowercase letter', passed: /[a-z]/.test(password) },
    { id: 'upper', label: 'Contains uppercase letter', passed: /[A-Z]/.test(password) },
    { id: 'digit', label: 'Contains a digit', passed: /[0-9]/.test(password) },
    { id: 'special', label: 'Contains a special character', passed: /[^a-zA-Z0-9]/.test(password) },
    {
      id: 'nocommon',
      label: 'Not a common password',
      passed: !['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome'].includes(
        password.toLowerCase(),
      ),
    },
  ]
  const passed = checks.filter((c) => c.passed).length
  const entropyBits = estimateEntropy(password)
  let score = 0
  if (passed <= 2 || entropyBits < 28) score = 0
  else if (passed <= 3 || entropyBits < 36) score = 1
  else if (passed <= 4 || entropyBits < 50) score = 2
  else if (passed <= 5 || entropyBits < 60) score = 3
  else score = 4

  const labels: PasswordStrength['label'][] = [
    'Very Weak',
    'Weak',
    'Fair',
    'Strong',
    'Very Strong',
  ]
  return { score, label: labels[score], checks, entropyBits }
}
