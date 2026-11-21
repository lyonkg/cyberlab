import { describe, expect, it } from 'vitest'
import {
  DEMO_PRODUCTS,
  PRODUCT_COLUMN_COUNT,
  parseUnionQuery,
  runQuery,
  simulateSearch,
} from './sqlSelect'

describe('parseUnionQuery / runQuery', () => {
  it('selects products', () => {
    const r = runQuery('SELECT id, title, body FROM products')
    expect(r.columns).toEqual(['id', 'title', 'body'])
    expect(r.rows).toHaveLength(DEMO_PRODUCTS.length)
  })

  it('filters with WHERE and honors AND-before-OR', () => {
    const r = runQuery("SELECT id, title, body FROM products WHERE title = 'nope' OR 1 = 1 AND id = 2")
    // title='nope' OR (1=1 AND id=2) → only id 2
    expect(r.rows.map((x) => x.id)).toEqual([2])
  })

  it('ORDER BY 1..N succeeds; past N errors', () => {
    expect(runQuery('SELECT id, title, body FROM products ORDER BY 1').rows[0].id).toBe(1)
    expect(runQuery('SELECT id, title, body FROM products ORDER BY 3 DESC').rows[0].id).toBeTruthy()
    expect(() => runQuery('SELECT id, title, body FROM products ORDER BY 4')).toThrow(/out of range/)
    try {
      runQuery('SELECT id, title, body FROM products ORDER BY 99')
    } catch (e) {
      expect((e as { kind: string }).kind).toBe('order-by')
    }
  })

  it('ORDER BY unknown column errors', () => {
    expect(() => runQuery('SELECT id, title, body FROM products ORDER BY missing')).toThrow(/Unknown column/)
  })

  it('UNION column-count mismatch (too few)', () => {
    expect(() =>
      runQuery("SELECT id, title, body FROM products UNION SELECT username, password FROM users"),
    ).toThrow(/same number of result columns/)
  })

  it('UNION column-count mismatch (too many)', () => {
    expect(() =>
      runQuery(
        "SELECT id, title, body FROM products UNION SELECT id, username, password, role FROM users",
      ),
    ).toThrow(/same number of result columns \(3 vs 4\)/)
  })

  it('UNION with matching columns leaks user data', () => {
    const r = runQuery(
      "SELECT id, title, body FROM products WHERE title LIKE '%x%' UNION SELECT null, username, password FROM users",
    )
    expect(r.rows.length).toBeGreaterThanOrEqual(3)
    const leaked = r.rows.filter((_, i) => r.sources[i] > 0)
    expect(leaked.map((x) => x.title)).toEqual(['alice', 'bob', 'admin'])
    expect(leaked.map((x) => x.body)).toEqual(['wonderland', 'builder', 's3cret!'])
    expect(leaked.every((x) => x.id === null)).toBe(true)
  })

  it('UNION ALL keeps duplicates; UNION DISTINCT drops them', () => {
    const all = runQuery(
      "SELECT id, title, body FROM products WHERE id = 1 UNION ALL SELECT id, title, body FROM products WHERE id = 1",
    )
    expect(all.rows).toHaveLength(2)
    const distinct = runQuery(
      "SELECT id, title, body FROM products WHERE id = 1 UNION SELECT id, title, body FROM products WHERE id = 1",
    )
    expect(distinct.rows).toHaveLength(1)
  })

  it('rejects stacked queries', () => {
    expect(() =>
      runQuery("SELECT id, title, body FROM products; DROP TABLE users"),
    ).toThrow(/stacked/)
  })

  it('SELECT * works and counts as table width for UNION', () => {
    expect(runQuery('SELECT * FROM products').columns).toEqual(['id', 'title', 'body'])
    // users has 4 cols — mismatch against products *
    expect(() => runQuery('SELECT * FROM products UNION SELECT * FROM users')).toThrow(/same number/)
  })

  it('exposes a 3-column product schema', () => {
    expect(PRODUCT_COLUMN_COUNT).toBe(3)
    expect(parseUnionQuery('SELECT id, title, body FROM products').selects).toHaveLength(1)
  })
})

describe('simulateSearch — vulnerable', () => {
  it('normal search returns matching products', () => {
    const r = simulateSearch('Patch', true)
    expect(r.error).toBeNull()
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0].title).toBe('Patch Tuesday')
    expect(r.leakedRowIndexes).toHaveLength(0)
  })

  it('ORDER BY probe: 1/2/3 OK, 4 errors', () => {
    for (const n of [1, 2, 3]) {
      const r = simulateSearch(`' ORDER BY ${n} --`, true)
      expect(r.error, `ORDER BY ${n}`).toBeNull()
    }
    const bad = simulateSearch("' ORDER BY 4 --", true)
    expect(bad.error).toMatch(/out of range/)
    expect(bad.errorKind).toBe('order-by')
  })

  it('too-few-columns UNION errors', () => {
    const r = simulateSearch("' UNION SELECT username, password FROM users --", true)
    expect(r.errorKind).toBe('column-count')
    expect(r.error).toMatch(/same number of result columns/)
  })

  it('too-many-columns UNION errors', () => {
    const r = simulateSearch("' UNION SELECT null, null, null, null FROM users --", true)
    expect(r.errorKind).toBe('column-count')
  })

  it("classic payload ' UNION SELECT null, username, password FROM users -- leaks creds", () => {
    const r = simulateSearch("' UNION SELECT null, username, password FROM users --", true)
    expect(r.error).toBeNull()
    expect(r.leakedRowIndexes.length).toBe(3)
    const leaked = r.leakedRowIndexes.map((i) => r.rows[i])
    expect(leaked.map((x) => x.title)).toEqual(['alice', 'bob', 'admin'])
    expect(leaked.map((x) => x.body)).toEqual(['wonderland', 'builder', 's3cret!'])
    expect(r.query).toContain("UNION SELECT null, username, password FROM users")
    // comment strips the trailing quote+percent from the LIKE close
    expect(r.effectiveSql).toMatch(/UNION SELECT null, username, password FROM users/i)
  })

  it('lone quote is a syntax error', () => {
    const r = simulateSearch("'", true)
    expect(r.error).not.toBeNull()
    expect(r.errorKind).toBe('syntax')
  })
})

describe('simulateSearch — parameterized', () => {
  const payloads = [
    "' UNION SELECT null, username, password FROM users --",
    "' ORDER BY 1 --",
    "' ORDER BY 4 --",
    "' UNION SELECT username, password FROM users --",
  ]
  it.each(payloads)('blocks %s', (input) => {
    const r = simulateSearch(input, false)
    expect(r.vulnerable).toBe(false)
    expect(r.leakedRowIndexes).toHaveLength(0)
    expect(r.error).toBeNull()
    expect(r.query).toContain('?')
    // Should not return leaked usernames as titles
    expect(r.rows.every((row) => !['alice', 'bob', 'admin'].includes(String(row.title)))).toBe(true)
  })

  it('still finds real titles', () => {
    const r = simulateSearch('Welcome', false)
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0].title).toBe('Welcome')
  })
})

describe('input bounds', () => {
  it('truncates oversized search input without leaving the simulator', () => {
    const r = simulateSearch('Patch' + 'A'.repeat(8000), false)
    expect(r.vulnerable).toBe(false)
    expect(r.query.length).toBeLessThan(2000)
  })
})
