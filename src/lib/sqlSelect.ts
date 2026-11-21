/**
 * Compatibility façade for SELECT / UNION / ORDER BY (and now JOIN / subquery).
 * New code should import from './sql'. This file preserves the historical API
 * expected by UnionLab and sqlSelect.test.ts.
 */
import type { Expr, SelectCore, SelectField } from './sql'
import {
  DEMO_PRODUCTS,
  DEMO_USERS,
  PRODUCT_COLUMN_COUNT,
  PRODUCT_COLUMNS,
  SqlError,
  TokenStream,
  createDemoDb,
  detectSearchInjection,
  parseCore,
  parseExpr,
  parseSql,
  runSelect,
  simulateSearch,
  type Product,
  type QueryResult,
  type Row,
  type SearchResult,
  type SimulatedUser,
  type Value,
} from './sql'

export {
  DEMO_PRODUCTS,
  DEMO_USERS,
  PRODUCT_COLUMNS,
  PRODUCT_COLUMN_COUNT,
  detectSearchInjection,
  simulateSearch,
}
export type { Product, SimulatedUser, Value, Row, SearchResult, QueryResult }

export type TableName = 'products' | 'users'

export type SelectItem = { kind: 'star' } | { kind: 'expr'; expr: Expr }

export interface SelectClause {
  items: SelectItem[]
  from: TableName
  where: Expr | null
  orderBy: { kind: 'pos'; n: number } | { kind: 'col'; name: string } | null
  orderDir: 'ASC' | 'DESC'
}

export interface UnionQuery {
  selects: SelectClause[]
  all: boolean
}

function fieldsToItems(fields: SelectField[]): SelectItem[] {
  return fields.map((f) =>
    f.kind === 'star' ? { kind: 'star' as const } : { kind: 'expr' as const, expr: f.expr },
  )
}

function coreToLegacy(
  core: SelectCore,
  orderBy: SelectClause['orderBy'],
  orderDir: 'ASC' | 'DESC',
): SelectClause {
  if (!core.from) throw new SqlError('FROM required', 'syntax')
  return {
    items: fieldsToItems(core.fields),
    from: core.from.table as TableName,
    where: core.where,
    orderBy,
    orderDir,
  }
}

export function parseSelectList(s: TokenStream): SelectItem[] {
  const items: SelectItem[] = []
  const one = (): SelectItem => {
    if (s.isOp('*')) {
      s.pos++
      return { kind: 'star' }
    }
    return { kind: 'expr', expr: parseExpr(s) }
  }
  items.push(one())
  while (s.isOp(',')) {
    s.pos++
    items.push(one())
  }
  if (!items.length) s.fail()
  return items
}

export function parseSelectClause(s: TokenStream): SelectClause {
  const core = parseCore(s)
  let orderBy: SelectClause['orderBy'] = null
  let orderDir: 'ASC' | 'DESC' = 'ASC'
  if (s.isKw('ORDER')) {
    s.pos++
    s.expectKw('BY')
    const t = s.peek()
    if (!t) s.fail()
    if (t.type === 'number') {
      orderBy = { kind: 'pos', n: t.value }
      s.pos++
    } else if (t.type === 'ident') {
      orderBy = { kind: 'col', name: t.value }
      s.pos++
    } else s.fail()
    if (s.isKw('ASC') || s.isKw('DESC')) {
      orderDir = s.peek()!.value as 'ASC' | 'DESC'
      s.pos++
    }
  }
  return coreToLegacy(core, orderBy, orderDir)
}

export function parseUnionQuery(sql: string): UnionQuery {
  const stmt = parseSql(sql)
  const orderBy: SelectClause['orderBy'] =
    stmt.orderBy?.kind === 'pos'
      ? { kind: 'pos', n: stmt.orderBy.n }
      : stmt.orderBy?.kind === 'expr' && stmt.orderBy.expr.kind === 'col'
        ? { kind: 'col', name: stmt.orderBy.expr.name }
        : null
  const orderDir = stmt.orderBy?.dir ?? 'ASC'
  const selects = stmt.selects.map((c, i) =>
    coreToLegacy(c, i === stmt.selects.length - 1 ? orderBy : null, orderDir),
  )
  const all = stmt.unionAll.length === 0 ? true : stmt.unionAll.every(Boolean)
  return { selects, all }
}

export function runQuery(sql: string): QueryResult {
  return runSelect(parseSql(sql), createDemoDb())
}
