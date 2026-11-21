/**
 * High-level teaching scenarios built on the SQL engine.
 * Each scenario has a vulnerable (string-concat) path and a parameterized path.
 */
import { LIMITS, clampLength } from '../validation'
import type { Row } from './ast'
import {
  DEMO_ORDERS,
  DEMO_PRODUCTS,
  DEMO_USERS,
  createDemoDb,
  type SimulatedUser,
} from './database'
import { runSelect } from './evaluator'
import { parseSql, parseWhere } from './parser'
import { SqlError, stripComments } from './tokenizer'
import { evalBoolOnRow } from './evaluator'

export const PRODUCT_COLUMNS = ['id', 'title', 'body'] as const
export const PRODUCT_COLUMN_COUNT = PRODUCT_COLUMNS.length
export const ORDER_COLUMNS = ['id', 'item', 'username', 'ship_to'] as const
export const ORDER_COLUMN_COUNT = ORDER_COLUMNS.length

const INJECTION_PATTERNS = [
  /'/, /--/, /#/, /\bor\b/i, /\bunion\b/i, /\bjoin\b/i, /\bselect\b/i,
  /\bexists\b/i, /\bin\b\s*\(/i, /\bsubstr\b/i, /;/,
]

export function detectInjection(input: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(input))
}

export function detectSearchInjection(input: string): boolean {
  return detectInjection(input)
}

// ---------- Login (WHERE-only) ----------

export interface SqliResult {
  query: string
  effectiveWhere: string
  vulnerable: boolean
  rows: SimulatedUser[]
  loggedIn: boolean
  message: string
  injectionDetected: boolean
  bypassed: boolean
  error: string | null
}

export function runWhere(where: string, table: SimulatedUser[] = DEMO_USERS): SimulatedUser[] {
  const expr = parseWhere(where)
  return table.filter((row) => evalBoolOnRow(expr, row as unknown as Row))
}

export function simulateLogin(username: string, password: string, vulnerable: boolean): SqliResult {
  username = clampLength(username, LIMITS.sqlInput)
  password = clampLength(password, LIMITS.sqlInput)
  const injectionDetected = detectInjection(username) || detectInjection(password)
  const legit = DEMO_USERS.find((u) => u.username === username && u.password === password)

  if (!vulnerable) {
    const query = `SELECT * FROM users WHERE username = ? AND password = ?  -- params: [${JSON.stringify(
      username,
    )}, ${JSON.stringify(password)}]`
    const rows = DEMO_USERS.filter((r) => r.username === username && r.password === password)
    return {
      query,
      effectiveWhere: 'username = ? AND password = ?',
      vulnerable: false,
      rows,
      loggedIn: rows.length > 0,
      bypassed: false,
      error: null,
      injectionDetected,
      message: rows.length
        ? `Welcome, ${rows[0].username}! (safe parameterized query)`
        : injectionDetected
          ? 'Injection attempt neutralized — inputs are bound as plain values, so quotes and -- are just characters.'
          : 'Invalid credentials.',
    }
  }

  const where = `username = '${username}' AND password = '${password}'`
  const query = `SELECT * FROM users WHERE ${where}`
  const effectiveWhere = stripComments(where)
  let rows: SimulatedUser[] = []
  try {
    rows = runWhere(where)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      query,
      effectiveWhere,
      vulnerable: true,
      rows: [],
      loggedIn: false,
      bypassed: false,
      error: msg,
      injectionDetected,
      message: `Database error: ${msg}. (Leaking raw SQL errors like this helps attackers refine payloads.)`,
    }
  }
  const loggedIn = rows.length > 0
  const bypassed = loggedIn && !legit
  let message: string
  if (!loggedIn) {
    message = injectionDetected
      ? "Query ran but matched no rows. Remember SQL precedence: AND binds tighter than OR, so the password check may still apply. Try commenting out the rest with --."
      : 'Invalid credentials.'
  } else if (bypassed) {
    message =
      rows.length > 1
        ? `Injection succeeded! WHERE clause matched ${rows.length} users — logged in as first row "${rows[0].username}" without a valid password.`
        : `Injection succeeded! Logged in as "${rows[0].username}" without the correct password.`
  } else {
    message = `Welcome, ${rows[0].username}!`
  }
  return {
    query,
    effectiveWhere,
    vulnerable: true,
    rows,
    loggedIn,
    bypassed,
    error: null,
    injectionDetected,
    message,
  }
}

// ---------- Product search (UNION / ORDER BY / blind) ----------

export interface SearchResult {
  query: string
  effectiveSql: string
  vulnerable: boolean
  columns: string[]
  rows: Row[]
  leakedRowIndexes: number[]
  injectionDetected: boolean
  error: string | null
  errorKind: string | null
  message: string
  columnCount: number
}

export function simulateSearch(input: string, vulnerable: boolean): SearchResult {
  input = clampLength(input, LIMITS.sqlInput)
  const columnCount = PRODUCT_COLUMN_COUNT
  const injectionDetected = detectSearchInjection(input)
  const db = createDemoDb()

  if (!vulnerable) {
    const needle = input.toLowerCase()
    const rows = DEMO_PRODUCTS.filter((p) => p.title.toLowerCase().includes(needle)).map((p) => ({
      ...p,
    })) as Row[]
    return {
      query: `SELECT id, title, body FROM products WHERE title LIKE ?  -- param: ${JSON.stringify('%' + input + '%')}`,
      effectiveSql: 'SELECT id, title, body FROM products WHERE title LIKE ?',
      vulnerable: false,
      columns: [...PRODUCT_COLUMNS],
      rows,
      leakedRowIndexes: [],
      injectionDetected,
      error: null,
      errorKind: null,
      columnCount,
      message: injectionDetected
        ? 'Injection attempt neutralized — the LIKE pattern is a bound value, so UNION / ORDER BY / JOIN / subquery never become SQL.'
        : rows.length
          ? `Found ${rows.length} product(s).`
          : 'No products matched.',
    }
  }

  const where = `title LIKE '%${input}%'`
  const query = `SELECT id, title, body FROM products WHERE ${where}`
  const effectiveSql = stripComments(query)
  try {
    const result = runSelect(parseSql(query), db)
    const leakedRowIndexes = result.sources
      .map((src, i) => (src > 0 ? i : -1))
      .filter((i) => i >= 0)
    const leaked = leakedRowIndexes.length > 0
    return {
      query,
      effectiveSql,
      vulnerable: true,
      columns: result.columns,
      rows: result.rows,
      leakedRowIndexes,
      injectionDetected,
      error: null,
      errorKind: null,
      columnCount,
      message: leaked
        ? `UNION succeeded — ${leakedRowIndexes.length} leaked row(s) appended from another table. Look at the highlighted rows.`
        : result.rows.length
          ? `Query OK — ${result.rows.length} row(s) from products.`
          : 'Query OK — 0 rows.',
    }
  } catch (e) {
    const err = e instanceof SqlError ? e : new SqlError(String(e))
    let tip = ''
    if (err.kind === 'column-count') {
      tip = ` Hint: the left SELECT returns ${columnCount} columns (${PRODUCT_COLUMNS.join(', ')}), so every UNION SELECT must return exactly ${columnCount} expressions.`
    } else if (err.kind === 'order-by') {
      tip = ` Hint: use ORDER BY 1, ORDER BY 2, … until it errors — the last success is the column count (${columnCount}).`
    } else if (err.kind === 'syntax') {
      tip = ' Hint: a lone quote or broken UNION often produces a syntax error — attackers use that feedback too.'
    } else if (err.kind === 'no-such-table') {
      tip = ' Hint: EXISTS/IN subqueries against unknown tables fail — that is itself a useful oracle.'
    }
    return {
      query,
      effectiveSql,
      vulnerable: true,
      columns: [...PRODUCT_COLUMNS],
      rows: [],
      leakedRowIndexes: [],
      injectionDetected,
      error: err.message,
      errorKind: err.kind,
      columnCount,
      message: `Database error: ${err.message}.${tip}`,
    }
  }
}

// ---------- Order lookup (JOIN) ----------

export interface OrderLookupResult {
  query: string
  effectiveSql: string
  vulnerable: boolean
  columns: string[]
  rows: Row[]
  leakedRowIndexes: number[]
  injectionDetected: boolean
  error: string | null
  errorKind: string | null
  message: string
  columnCount: number
}

/**
 * Vulnerable order-status page:
 *   SELECT o.id, o.item, u.username, o.ship_to
 *   FROM orders o INNER JOIN users u ON o.user_id = u.id
 *   WHERE o.id = '{input}'
 */
export function simulateOrderLookup(input: string, vulnerable: boolean): OrderLookupResult {
  input = clampLength(input, LIMITS.sqlInput)
  const injectionDetected = detectInjection(input)
  const columnCount = ORDER_COLUMN_COUNT
  const db = createDemoDb()

  if (!vulnerable) {
    const id = Number(input)
    const rows: Row[] = []
    if (Number.isInteger(id)) {
      for (const o of DEMO_ORDERS) {
        if (o.id !== id) continue
        const u = DEMO_USERS.find((x) => x.id === o.user_id)
        rows.push({
          id: o.id,
          item: o.item,
          username: u?.username ?? null,
          ship_to: o.ship_to,
        })
      }
    }
    return {
      query: `SELECT o.id, o.item, u.username, o.ship_to FROM orders o INNER JOIN users u ON o.user_id = u.id WHERE o.id = ?  -- param: ${JSON.stringify(input)}`,
      effectiveSql:
        'SELECT o.id, o.item, u.username, o.ship_to FROM orders o INNER JOIN users u ON o.user_id = u.id WHERE o.id = ?',
      vulnerable: false,
      columns: [...ORDER_COLUMNS],
      rows,
      leakedRowIndexes: [],
      injectionDetected,
      error: null,
      errorKind: null,
      columnCount,
      message: injectionDetected
        ? 'Injection attempt neutralized — the order id is a bound parameter, so OR / JOIN / UNION never become SQL.'
        : rows.length
          ? `Found ${rows.length} order(s).`
          : 'No order with that id.',
    }
  }

  const query =
    `SELECT o.id, o.item, u.username, o.ship_to FROM orders o INNER JOIN users u ON o.user_id = u.id WHERE o.id = '${input}'`
  const effectiveSql = stripComments(query)
  try {
    const result = runSelect(parseSql(query), db)
    // Mark rows beyond a single legitimate match as "leaked" when injection widened the result
    const legitId = Number(input.replace(/'.*$/, '')) // rough
    const leakedRowIndexes = result.rows
      .map((r, i) => {
        if (result.sources[i] > 0) return i
        if (injectionDetected && String(r.id) !== String(legitId) && result.rows.length > 1) return i
        return -1
      })
      .filter((i) => i >= 0)
    // If OR 1=1 returned everything, highlight all but the first as leaked-ish
    const widened = injectionDetected && result.rows.length > 1 && result.sources.every((s) => s === 0)
    const highlight = widened
      ? result.rows.map((_, i) => i).filter((i) => i > 0 || String(result.rows[i].id) !== input)
      : leakedRowIndexes
    return {
      query,
      effectiveSql,
      columns: result.columns,
      rows: result.rows,
      leakedRowIndexes: highlight,
      vulnerable: true,
      injectionDetected,
      error: null,
      errorKind: null,
      columnCount,
      message: highlight.length
        ? `Injection widened the JOIN result — ${result.rows.length} row(s), including other users' orders and shipping addresses.`
        : result.rows.length
          ? `Query OK — ${result.rows.length} order row(s).`
          : 'Query OK — 0 rows.',
    }
  } catch (e) {
    const err = e instanceof SqlError ? e : new SqlError(String(e))
    return {
      query,
      effectiveSql,
      vulnerable: true,
      columns: [...ORDER_COLUMNS],
      rows: [],
      leakedRowIndexes: [],
      injectionDetected,
      error: err.message,
      errorKind: err.kind,
      columnCount,
      message: `Database error: ${err.message}.`,
    }
  }
}

// ---------- Blind / boolean subquery extraction ----------

export interface BlindResult {
  query: string
  effectiveSql: string
  vulnerable: boolean
  matched: boolean
  rows: Row[]
  injectionDetected: boolean
  error: string | null
  errorKind: string | null
  message: string
  /** True when the boolean condition made the product row appear (oracle = true). */
  oracleTrue: boolean
}

/**
 * Blind boolean lab reuses the product search page. A matching product ("Welcome")
 * is the true-oracle; no rows means the injected condition was false (or an error).
 */
export function simulateBlind(input: string, vulnerable: boolean): BlindResult {
  input = clampLength(input, LIMITS.sqlInput)
  const injectionDetected = detectInjection(input)
  const base = simulateSearch(input.length ? input : 'Welcome', vulnerable)
  // For the blind lab, start from a known hit unless the user already typed a full payload
  const searchInput = input.includes("'") ? input : `Welcome${input}`
  const r = input.includes("'") ? base : simulateSearch(searchInput, vulnerable)
  const matched = r.rows.length > 0 && !r.error
  return {
    query: r.query,
    effectiveSql: r.effectiveSql,
    vulnerable: r.vulnerable,
    matched,
    rows: r.rows,
    injectionDetected: r.injectionDetected || injectionDetected,
    error: r.error,
    errorKind: r.errorKind,
    oracleTrue: matched,
    message: r.error
      ? r.message
      : matched
        ? r.vulnerable && injectionDetected
          ? `Boolean oracle TRUE — ${r.rows.length} product row(s) returned (the injected condition held).`
          : r.message
        : r.vulnerable && injectionDetected
          ? 'Boolean oracle FALSE — 0 rows (the injected condition was false, or filtered everything out).'
          : r.message,
  }
}
