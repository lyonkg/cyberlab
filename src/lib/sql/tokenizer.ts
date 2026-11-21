/** Tokenizer for the teaching SQL engine, plus the shared SqlError types. */
import { LIMITS } from '../validation'

export type Keyword =
  | 'AND' | 'OR' | 'NOT' | 'TRUE' | 'FALSE' | 'NULL'
  | 'SELECT' | 'FROM' | 'WHERE' | 'UNION' | 'ALL' | 'ORDER' | 'BY' | 'ASC' | 'DESC'
  | 'LIKE' | 'JOIN' | 'INNER' | 'LEFT' | 'OUTER' | 'ON' | 'AS' | 'IN' | 'EXISTS' | 'IS'

export type SqlErrorKind =
  | 'syntax'
  | 'stacked'
  | 'column-count'
  | 'order-by'
  | 'no-such-column'
  | 'no-such-table'
  | 'ambiguous-column'
  | 'subquery'

export class SqlError extends Error {
  kind: SqlErrorKind
  constructor(message: string, kind: SqlErrorKind = 'syntax') {
    super(message)
    this.kind = kind
    this.name = 'SqlError'
  }
}

export class SqlSyntaxError extends SqlError {
  constructor(message: string) {
    super(message, 'syntax')
    this.name = 'SqlSyntaxError'
  }
}

export type OpValue =
  | '=' | '<>' | '!=' | '<' | '>' | '<=' | '>='
  | '(' | ')' | ';' | ',' | '*' | '.' | '||'

export type Token =
  | { type: 'string'; value: string; raw: string }
  | { type: 'number'; value: number; raw: string }
  | { type: 'ident'; value: string; raw: string }
  | { type: 'keyword'; value: Keyword; raw: string }
  | { type: 'op'; value: OpValue; raw: string }

const KEYWORDS = new Set<string>([
  'AND', 'OR', 'NOT', 'TRUE', 'FALSE', 'NULL',
  'SELECT', 'FROM', 'WHERE', 'UNION', 'ALL', 'ORDER', 'BY', 'ASC', 'DESC',
  'LIKE', 'JOIN', 'INNER', 'LEFT', 'OUTER', 'ON', 'AS', 'IN', 'EXISTS', 'IS',
])

export function tokenize(sql: string): Token[] {
  if (sql.length > LIMITS.sqlQuery) {
    throw new SqlSyntaxError('query too long for the in-memory teaching engine')
  }
  const tokens: Token[] = []
  let i = 0
  while (i < sql.length) {
    if (tokens.length > LIMITS.sqlTokens) {
      throw new SqlSyntaxError('too many tokens for the in-memory teaching engine')
    }
    const ch = sql[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      continue
    }
    if (ch === "'") {
      let value = ''
      let j = i + 1
      let closed = false
      while (j < sql.length) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            value += "'"
            j += 2
            continue
          }
          closed = true
          break
        }
        value += sql[j]
        j++
      }
      if (!closed) {
        throw new SqlSyntaxError(
          `unrecognized token: unterminated string literal near "${sql.slice(i, i + 20)}"`,
        )
      }
      tokens.push({ type: 'string', value, raw: sql.slice(i, j + 1) })
      i = j + 1
      continue
    }
    // number: digits, optional single dot (not a qualified-name dot)
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(sql[i + 1] ?? ''))) {
      let j = i
      let seenDot = false
      while (j < sql.length && (/[0-9]/.test(sql[j]) || (sql[j] === '.' && !seenDot))) {
        if (sql[j] === '.') seenDot = true
        j++
      }
      const raw = sql.slice(i, j)
      tokens.push({ type: 'number', value: Number(raw), raw })
      i = j
      continue
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) j++
      const raw = sql.slice(i, j)
      const upper = raw.toUpperCase()
      if (KEYWORDS.has(upper)) tokens.push({ type: 'keyword', value: upper as Keyword, raw })
      else tokens.push({ type: 'ident', value: raw.toLowerCase(), raw })
      i = j
      continue
    }
    if (ch === '|' && sql[i + 1] === '|') {
      tokens.push({ type: 'op', value: '||', raw: '||' })
      i += 2
      continue
    }
    if (ch === '<' && sql[i + 1] === '>') {
      tokens.push({ type: 'op', value: '<>', raw: '<>' })
      i += 2
      continue
    }
    if (ch === '<' && sql[i + 1] === '=') {
      tokens.push({ type: 'op', value: '<=', raw: '<=' })
      i += 2
      continue
    }
    if (ch === '>' && sql[i + 1] === '=') {
      tokens.push({ type: 'op', value: '>=', raw: '>=' })
      i += 2
      continue
    }
    if (ch === '!' && sql[i + 1] === '=') {
      tokens.push({ type: 'op', value: '!=', raw: '!=' })
      i += 2
      continue
    }
    if ('=<>(),*.;'.includes(ch)) {
      tokens.push({ type: 'op', value: ch as OpValue, raw: ch })
      i++
      continue
    }
    throw new SqlSyntaxError(`near "${ch}": syntax error`)
  }
  return tokens
}

/** Tokenize and refuse stacked statements (anything after a non-trailing `;`). */
export function statementTokens(sql: string): Token[] {
  const tokens = tokenize(sql)
  const semi = tokens.findIndex((t) => t.type === 'op' && t.value === ';')
  if (semi !== -1 && semi < tokens.length - 1) {
    throw new SqlError('stacked queries are not allowed by this driver', 'stacked')
  }
  return semi === -1 ? tokens : tokens.slice(0, semi)
}

/** Remove `--` comments (outside string literals) to show what the DB really evaluates. */
export function stripComments(sql: string): string {
  let out = ''
  let inStr = false
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    if (inStr) {
      out += ch
      if (ch === "'") {
        if (sql[i + 1] === "'") {
          out += "'"
          i++
        } else inStr = false
      }
      continue
    }
    if (ch === "'") {
      inStr = true
      out += ch
      continue
    }
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      continue
    }
    out += ch
  }
  return out.trim()
}
