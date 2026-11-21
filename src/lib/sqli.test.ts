import { describe, expect, it } from 'vitest'
import { detectInjection, parseWhere, runWhere, simulateLogin, stripComments } from './sqli'

describe('SQL engine', () => {
  it('AND binds tighter than OR', () => {
    // a OR (b AND c), not (a OR b) AND c
    const e = parseWhere("username = 'x' OR 1 = 1 AND password = 'nope'")
    expect(e.kind).toBe('or')
    expect(runWhere("username = 'x' OR 1 = 1 AND password = 'nope'")).toHaveLength(0)
    expect(runWhere("(username = 'x' OR 1 = 1) AND password = 'builder'").map((r) => r.username)).toEqual([
      'bob',
    ])
  })

  it('treats -- as a comment outside strings only', () => {
    expect(stripComments("username = 'admin' -- AND password = 'x'")).toBe("username = 'admin'")
    expect(runWhere("username = 'a--b'")).toHaveLength(0) // no parse error: -- inside literal
    expect(stripComments("username = 'a--b'")).toBe("username = 'a--b'")
  })

  it('handles escaped quotes in literals', () => {
    expect(runWhere("username = 'o''brien'")).toHaveLength(0)
  })

  it('throws syntax error on unbalanced quote', () => {
    expect(() => runWhere("username = ''' AND password = 'x'")).toThrow()
  })

  it('supports NOT and <>', () => {
    expect(runWhere("NOT role = 'admin'")).toHaveLength(2)
    expect(runWhere("role <> 'user'").map((r) => r.username)).toEqual(['admin'])
  })
})

describe('simulateLogin — vulnerable (string concatenation)', () => {
  it('logs in with valid credentials', () => {
    const r = simulateLogin('alice', 'wonderland', true)
    expect(r.loggedIn).toBe(true)
    expect(r.bypassed).toBe(false)
    expect(r.query).toBe("SELECT * FROM users WHERE username = 'alice' AND password = 'wonderland'")
  })

  it("precedence: ' OR '1'='1 in username with wrong password does NOT bypass", () => {
    const r = simulateLogin("' OR '1'='1", 'x', true)
    // username='' OR ('1'='1' AND password='x') -> no row has password x
    expect(r.error).toBeNull()
    expect(r.loggedIn).toBe(false)
    expect(r.rows).toHaveLength(0)
  })

  it("' OR 1=1 -- bypasses auth and returns all users", () => {
    const r = simulateLogin("' OR 1=1 --", 'anything', true)
    expect(r.effectiveWhere).toBe("username = '' OR 1=1")
    expect(r.loggedIn).toBe(true)
    expect(r.bypassed).toBe(true)
    expect(r.rows).toHaveLength(3)
  })

  it("admin' -- logs in as admin without password", () => {
    const r = simulateLogin("admin' --", 'nope', true)
    expect(r.loggedIn).toBe(true)
    expect(r.bypassed).toBe(true)
    expect(r.rows.map((x) => x.username)).toEqual(['admin'])
  })

  it("' OR '1'='1 in BOTH fields bypasses (tautology survives precedence)", () => {
    const r = simulateLogin("' OR '1'='1", "' OR '1'='1", true)
    expect(r.loggedIn).toBe(true)
    expect(r.rows).toHaveLength(3)
  })

  it('reports a syntax error for a lone quote', () => {
    const r = simulateLogin("'", 'x', true)
    expect(r.error).not.toBeNull()
    expect(r.loggedIn).toBe(false)
  })

  it('rejects stacked queries', () => {
    const r = simulateLogin("'; DROP TABLE users; --", 'x', true)
    expect(r.loggedIn).toBe(false)
    expect(r.error).toMatch(/stacked/)
  })
})

describe('simulateLogin — parameterized', () => {
  const payloads: [string, string][] = [
    ["' OR 1=1 --", 'x'],
    ["admin' --", 'x'],
    ["' OR '1'='1", "' OR '1'='1"],
  ]
  it.each(payloads)('blocks %s / %s', (u, p) => {
    const r = simulateLogin(u, p, false)
    expect(r.loggedIn).toBe(false)
    expect(r.bypassed).toBe(false)
    expect(r.injectionDetected).toBe(true)
    expect(r.query).toContain('?')
  })

  it('still allows real credentials', () => {
    expect(simulateLogin('bob', 'builder', false).loggedIn).toBe(true)
  })
})

describe('detectInjection', () => {
  it('flags quotes and comments', () => {
    expect(detectInjection("admin' --")).toBe(true)
    expect(detectInjection('normaluser')).toBe(false)
  })
})

describe('input bounds', () => {
  it('truncates oversized input and still stays in the simulator', () => {
    const u = "admin' --" + 'A'.repeat(5000)
    const r = simulateLogin(u, 'x', true)
    expect(r.loggedIn).toBe(true)
    expect(r.bypassed).toBe(true)
    expect(r.query.length).toBeLessThanOrEqual(4096 + 64)
  })

  it('rejects an oversized raw query in the lexer', async () => {
    const { tokenize, SqlSyntaxError } = await import('./sqli')
    expect(() => tokenize('a '.repeat(3000))).toThrow(SqlSyntaxError)
  })
})
