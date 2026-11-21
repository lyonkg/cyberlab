/**
 * Recursive-descent parser for the teaching SQL engine.
 * Precedence (low → high): OR < AND < NOT < comparison/LIKE/IN/IS < || < primary.
 */
import type { CmpOp, Expr, JoinClause, OrderBy, SelectCore, SelectField, SelectStmt, TableRef } from './ast'
import { SqlSyntaxError, statementTokens, type Keyword, type Token } from './tokenizer'

export class TokenStream {
  tokens: Token[]
  pos = 0
  constructor(tokens: Token[]) {
    this.tokens = tokens
  }
  peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset]
  }
  next(): Token | undefined {
    return this.tokens[this.pos++]
  }
  done(): boolean {
    return this.pos >= this.tokens.length
  }
  isKw(kw: Keyword, offset = 0): boolean {
    const t = this.peek(offset)
    return t?.type === 'keyword' && t.value === kw
  }
  isOp(op: string, offset = 0): boolean {
    const t = this.peek(offset)
    return t?.type === 'op' && t.value === op
  }
  expectKw(kw: Keyword): void {
    if (!this.isKw(kw)) this.fail()
    this.pos++
  }
  expectOp(op: string): void {
    if (!this.isOp(op)) {
      if (op === ')') throw new SqlSyntaxError('expected ")"')
      this.fail()
    }
    this.pos++
  }
  fail(): never {
    const t = this.peek()
    throw new SqlSyntaxError(t ? `near "${t.raw}": syntax error` : 'incomplete input')
  }
}

const CMP_OPS: Record<string, CmpOp> = {
  '=': '=', '<>': '<>', '!=': '<>', '<': '<', '>': '>', '<=': '<=', '>=': '>=',
}

export function parseExpr(s: TokenStream): Expr {
  return parseOr(s)
}

function parseOr(s: TokenStream): Expr {
  let left = parseAnd(s)
  while (s.isKw('OR')) {
    s.pos++
    left = { kind: 'or', left, right: parseAnd(s) }
  }
  return left
}

function parseAnd(s: TokenStream): Expr {
  let left = parseNot(s)
  while (s.isKw('AND')) {
    s.pos++
    left = { kind: 'and', left, right: parseNot(s) }
  }
  return left
}

function parseNot(s: TokenStream): Expr {
  if (s.isKw('NOT')) {
    s.pos++
    if (s.isKw('EXISTS')) {
      const e = parsePrimary(s)
      if (e.kind === 'exists') return { ...e, negated: true }
      return { kind: 'not', expr: e }
    }
    return { kind: 'not', expr: parseNot(s) }
  }
  return parseComparison(s)
}

function parseComparison(s: TokenStream): Expr {
  const left = parseConcat(s)
  const t = s.peek()
  if (t?.type === 'op' && t.value in CMP_OPS) {
    s.pos++
    return { kind: 'cmp', op: CMP_OPS[t.value], left, right: parseConcat(s) }
  }
  // [NOT] LIKE / [NOT] IN
  let negated = false
  if (s.isKw('NOT') && (s.isKw('LIKE', 1) || s.isKw('IN', 1))) {
    negated = true
    s.pos++
  }
  if (s.isKw('LIKE')) {
    s.pos++
    return { kind: 'like', left, right: parseConcat(s), negated }
  }
  if (s.isKw('IN')) {
    s.pos++
    s.expectOp('(')
    if (s.isKw('SELECT')) {
      const sub = parseStatement(s)
      s.expectOp(')')
      return { kind: 'in', expr: left, list: null, sub, negated }
    }
    const list: Expr[] = [parseExpr(s)]
    while (s.isOp(',')) {
      s.pos++
      list.push(parseExpr(s))
    }
    s.expectOp(')')
    return { kind: 'in', expr: left, list, sub: null, negated }
  }
  if (s.isKw('IS')) {
    s.pos++
    let neg = false
    if (s.isKw('NOT')) {
      neg = true
      s.pos++
    }
    s.expectKw('NULL')
    return { kind: 'isnull', expr: left, negated: neg }
  }
  return left
}

function parseConcat(s: TokenStream): Expr {
  const first = parsePrimary(s)
  if (!s.isOp('||')) return first
  const parts = [first]
  while (s.isOp('||')) {
    s.pos++
    parts.push(parsePrimary(s))
  }
  return { kind: 'concat', parts }
}

function parsePrimary(s: TokenStream): Expr {
  const t = s.peek()
  if (!t) throw new SqlSyntaxError('incomplete input')

  if (t.type === 'string' || t.type === 'number') {
    s.pos++
    return { kind: 'lit', value: t.value }
  }
  if (t.type === 'keyword') {
    if (t.value === 'TRUE' || t.value === 'FALSE' || t.value === 'NULL') {
      s.pos++
      return { kind: 'lit', value: t.value === 'NULL' ? null : t.value === 'TRUE' }
    }
    if (t.value === 'EXISTS') {
      s.pos++
      s.expectOp('(')
      if (!s.isKw('SELECT')) s.fail()
      const sub = parseStatement(s)
      s.expectOp(')')
      return { kind: 'exists', sub, negated: false }
    }
    s.fail()
  }
  if (t.type === 'ident') {
    s.pos++
    // function call
    if (s.isOp('(')) {
      s.pos++
      const name = t.value.toUpperCase()
      if (s.isOp('*')) {
        s.pos++
        s.expectOp(')')
        return { kind: 'func', name, args: [], star: true }
      }
      const args: Expr[] = []
      if (!s.isOp(')')) {
        args.push(parseExpr(s))
        while (s.isOp(',')) {
          s.pos++
          args.push(parseExpr(s))
        }
      }
      s.expectOp(')')
      return { kind: 'func', name, args, star: false }
    }
    // qualified column  t.col
    if (s.isOp('.')) {
      const nameTok = s.peek(1)
      if (nameTok?.type === 'ident') {
        s.pos += 2
        return { kind: 'col', table: t.value, name: nameTok.value }
      }
      s.pos++
      s.fail()
    }
    return { kind: 'col', table: null, name: t.value }
  }
  if (t.type === 'op' && t.value === '(') {
    s.pos++
    if (s.isKw('SELECT')) {
      const sub = parseStatement(s)
      s.expectOp(')')
      return { kind: 'subquery', sub }
    }
    const e = parseExpr(s)
    s.expectOp(')')
    return e
  }
  s.fail()
}

function parseAlias(s: TokenStream): string | null {
  if (s.isKw('AS')) {
    s.pos++
    const t = s.peek()
    if (t?.type !== 'ident') s.fail()
    s.pos++
    return t.value
  }
  const t = s.peek()
  if (t?.type === 'ident') {
    s.pos++
    return t.value
  }
  return null
}

function parseFields(s: TokenStream): SelectField[] {
  const fields: SelectField[] = []
  const parseOne = (): SelectField => {
    if (s.isOp('*')) {
      s.pos++
      return { kind: 'star', table: null }
    }
    const t = s.peek()
    if (t?.type === 'ident' && s.isOp('.', 1) && s.isOp('*', 2)) {
      s.pos += 3
      return { kind: 'star', table: t.value }
    }
    const expr = parseExpr(s)
    return { kind: 'expr', expr, alias: parseAlias(s) }
  }
  fields.push(parseOne())
  while (s.isOp(',')) {
    s.pos++
    fields.push(parseOne())
  }
  return fields
}

function parseTableRef(s: TokenStream): TableRef {
  const t = s.peek()
  if (t?.type !== 'ident') s.fail()
  s.pos++
  return { table: t.value, alias: parseAlias(s) }
}

export function parseCore(s: TokenStream): SelectCore {
  s.expectKw('SELECT')
  const fields = parseFields(s)
  let from: TableRef | null = null
  const joins: JoinClause[] = []
  if (s.isKw('FROM')) {
    s.pos++
    from = parseTableRef(s)
    for (;;) {
      let type: 'inner' | 'left' | null = null
      if (s.isKw('JOIN')) {
        type = 'inner'
        s.pos++
      } else if (s.isKw('INNER') && s.isKw('JOIN', 1)) {
        type = 'inner'
        s.pos += 2
      } else if (s.isKw('LEFT')) {
        s.pos++
        if (s.isKw('OUTER')) s.pos++
        s.expectKw('JOIN')
        type = 'left'
      }
      if (!type) break
      const ref = parseTableRef(s)
      s.expectKw('ON')
      joins.push({ type, table: ref.table, alias: ref.alias, on: parseExpr(s) })
    }
  }
  let where: Expr | null = null
  if (s.isKw('WHERE')) {
    s.pos++
    where = parseExpr(s)
  }
  return { fields, from, joins, where }
}

function parseOrderBy(s: TokenStream): OrderBy | null {
  if (!s.isKw('ORDER')) return null
  s.pos++
  s.expectKw('BY')
  const t = s.peek()
  if (!t) s.fail()
  let order: OrderBy
  if (t.type === 'number') {
    s.pos++
    order = { kind: 'pos', n: t.value, dir: 'ASC' }
  } else {
    order = { kind: 'expr', expr: parseExpr(s), dir: 'ASC' }
  }
  if (s.isKw('ASC') || s.isKw('DESC')) {
    order.dir = s.next()!.value as 'ASC' | 'DESC'
  }
  return order
}

/** SELECT … [UNION [ALL] SELECT …]* [ORDER BY …] — stops before a closing ")" for subqueries. */
export function parseStatement(s: TokenStream): SelectStmt {
  const selects = [parseCore(s)]
  const unionAll: boolean[] = []
  while (s.isKw('UNION')) {
    s.pos++
    let all = false
    if (s.isKw('ALL')) {
      all = true
      s.pos++
    }
    unionAll.push(all)
    selects.push(parseCore(s))
  }
  const orderBy = parseOrderBy(s)
  return { selects, unionAll, orderBy }
}

/** Parse a complete top-level statement (refuses stacked queries and trailing tokens). */
export function parseSql(sql: string): SelectStmt {
  const s = new TokenStream(statementTokens(sql))
  const stmt = parseStatement(s)
  if (!s.done()) s.fail()
  return stmt
}

/** Parse just a WHERE-clause expression (used by the login lab). */
export function parseWhere(sql: string): Expr {
  const s = new TokenStream(statementTokens(sql))
  const expr = parseExpr(s)
  if (!s.done()) s.fail()
  return expr
}
