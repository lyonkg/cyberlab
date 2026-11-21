import { describe, expect, it } from 'vitest'
import {
  LIMITS,
  clampInt,
  clampLength,
  isAllowedLabApiBase,
  isAppPath,
  isIpOrCidrOrAny,
  isProgressId,
  isSafeHttpUrlForDisplay,
  parsePacketPort,
  parsePortInput,
  resolveLabApiUrl,
} from './validation'

describe('clampLength', () => {
  it('returns empty string for non-strings', () => {
    expect(clampLength(undefined, 10)).toBe('')
    expect(clampLength(42, 10)).toBe('')
  })

  it('truncates to max', () => {
    expect(clampLength('abcdef', 3)).toBe('abc')
    expect(clampLength('ab', 3)).toBe('ab')
  })
})

describe('isProgressId', () => {
  it('accepts lesson/lab style ids', () => {
    expect(isProgressId('sqli-login')).toBe(true)
    expect(isProgressId('aes')).toBe(true)
    expect(isProgressId('network.1')).toBe(true)
  })

  it('rejects unsafe ids', () => {
    expect(isProgressId('')).toBe(false)
    expect(isProgressId('../etc/passwd')).toBe(false)
    expect(isProgressId('a b')).toBe(false)
    expect(isProgressId('<script>')).toBe(false)
    expect(isProgressId('x'.repeat(80))).toBe(false)
  })
})

describe('isAppPath', () => {
  it('accepts in-app routes', () => {
    expect(isAppPath('/')).toBe(true)
    expect(isAppPath('/modules/network')).toBe(true)
    expect(isAppPath('/labs')).toBe(true)
  })

  it('rejects schemes, traversal, and junk', () => {
    expect(isAppPath('javascript:alert(1)')).toBe(false)
    expect(isAppPath('/javascript:alert(1)')).toBe(false)
    expect(isAppPath('//evil.example')).toBe(false)
    expect(isAppPath('/../secret')).toBe(false)
    expect(isAppPath('/labs?x=1')).toBe(false)
    expect(isAppPath('/labs#x')).toBe(false)
  })
})

describe('ports and ints', () => {
  it('parses ports', () => {
    expect(parsePortInput('443')).toBe(443)
    expect(parsePortInput('any')).toBe('any')
    expect(parsePortInput('*')).toBe('any')
    expect(parsePortInput('65536')).toBeNull()
    expect(parsePortInput('-1')).toBeNull()
    expect(parsePortInput('80abc')).toBeNull()
    expect(parsePacketPort('22')).toBe(22)
    expect(parsePacketPort('any')).toBeNull()
  })

  it('clamps ints', () => {
    expect(clampInt(3.9, 0, 5, 0)).toBe(3)
    expect(clampInt('99', 0, 10, 0)).toBe(10)
    expect(clampInt('nope', 0, 10, 4)).toBe(4)
  })
})

describe('isIpOrCidrOrAny', () => {
  it('accepts wildcards, ipv4, and cidr', () => {
    expect(isIpOrCidrOrAny('any')).toBe(true)
    expect(isIpOrCidrOrAny('10.0.0.10')).toBe(true)
    expect(isIpOrCidrOrAny('10.0.0.0/24')).toBe(true)
    expect(isIpOrCidrOrAny('0.0.0.0/0')).toBe(true)
  })

  it('rejects incomplete or out-of-range values', () => {
    expect(isIpOrCidrOrAny('10.0.')).toBe(false)
    expect(isIpOrCidrOrAny('10.0.0.256')).toBe(false)
    expect(isIpOrCidrOrAny('10.0.0.0/33')).toBe(false)
    expect(isIpOrCidrOrAny('javascript:1')).toBe(false)
  })
})

describe('lab API URL guard', () => {
  it('allows https bases and same-origin paths', () => {
    expect(isAllowedLabApiBase('https://labs.example.edu/api')).toBe(true)
    expect(isAllowedLabApiBase('/lab-api')).toBe(true)
  })

  it('rejects credentials, non-https, and schemes used in XSS', () => {
    expect(isAllowedLabApiBase('http://labs.example.edu')).toBe(false)
    expect(isAllowedLabApiBase('http://localhost:8787')).toBe(true)
    expect(isAllowedLabApiBase('http://127.0.0.1:8787')).toBe(true)
    expect(isAllowedLabApiBase('https://user:pass@labs.example.edu')).toBe(false)
    expect(isAllowedLabApiBase('javascript:alert(1)')).toBe(false)
    expect(isAllowedLabApiBase('data:text/html,x')).toBe(false)
    expect(isAllowedLabApiBase('//evil.example')).toBe(false)
    expect(isAllowedLabApiBase('')).toBe(false)
  })

  it('resolves a path without leaving the base origin', () => {
    const u = resolveLabApiUrl('capture', 'https://labs.example.edu/api')
    expect(u.href).toBe('https://labs.example.edu/api/capture')
  })

  it('refuses path traversal to another origin or absolute URLs', () => {
    expect(() => resolveLabApiUrl('https://evil.example/', 'https://labs.example.edu/api')).toThrow(
      /absolu/,
    )
    expect(() =>
      resolveLabApiUrl('//evil.example/pwn', 'https://labs.example.edu/api'),
    ).toThrow()
    expect(() => resolveLabApiUrl('x', 'https://user:pass@x.example')).toThrow(/base/)
  })
})

describe('isSafeHttpUrlForDisplay', () => {
  it('accepts http(s) and rejects javascript', () => {
    expect(isSafeHttpUrlForDisplay('https://github.com/settings/keys')).toBe(true)
    expect(isSafeHttpUrlForDisplay('http://192.168.99.23/steal')).toBe(true)
    expect(isSafeHttpUrlForDisplay('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrlForDisplay('not a url')).toBe(false)
  })
})

describe('limits', () => {
  it('exposes positive finite caps', () => {
    expect(LIMITS.sqlInput).toBeGreaterThan(100)
    expect(LIMITS.sqlTokens).toBeGreaterThan(10)
  })
})
