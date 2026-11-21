/**
 * Execute a SelectStmt against an in-memory Database.
 * Supports JOINs (INNER/LEFT), aliases, correlated scalar/IN/EXISTS subqueries,
 * COUNT aggregates, UNION [ALL], and ORDER BY.
 */
import type {
  Expr,
  JoinClause,
  OrderBy,
  Row,
  SelectCore,
  SelectField,
  SelectStmt,
  Value,
} from './ast'
import type { Database, Table } from './database'
import { AGGREGATES, callScalar } from './functions'
import { SqlError } from './tokenizer'

export interface QueryResult {
  columns: string[]
  rows: Row[]
  /** Which SELECT in the UNION each row came from (0 = leftmost). */
  sources: number[]
}

interface Scope {
  /** alias → table name */
  aliases: Map<string, string>
  /** bare column → owning alias (only when unambiguous) */
  bare: Map<string, string>
  /** ordered alias list matching join order */
  order: string[]
}

function qualifyKey(alias: string, col: string): string {
  return `${alias}.${col}`
}

function makeScope(fromAlias: string, fromTable: string, joins: { alias: string; table: string }[]): Scope {
  const aliases = new Map<string, string>([[fromAlias, fromTable]])
  const order = [fromAlias]
  for (const j of joins) {
    aliases.set(j.alias, j.table)
    order.push(j.alias)
  }
  return { aliases, bare: new Map(), order }
}

function fillBare(scope: Scope, db: Database): void {
  const counts = new Map<string, string[]>()
  for (const [alias, table] of scope.aliases) {
    const t = db[table]
    if (!t) throw new SqlError(`no such table: ${table}`, 'no-such-table')
    for (const c of t.columns) {
      const list = counts.get(c) ?? []
      list.push(alias)
      counts.set(c, list)
    }
  }
  for (const [col, owners] of counts) {
    if (owners.length === 1) scope.bare.set(col, owners[0])
  }
}

function resolveCol(table: string | null, name: string, scope: Scope, row: Row): Value {
  if (table) {
    const key = qualifyKey(table, name)
    if (!(key in row) && !(name in row && scope.aliases.has(table))) {
      // Prefer qualified; fall back to bare if this is the only table
      if (key in row) return row[key]
      throw new SqlError(`no such column: ${table}.${name}`, 'no-such-column')
    }
    if (key in row) return row[key]
  }
  if (name in row) return row[name]
  if (!table) {
    const owner = scope.bare.get(name)
    if (owner) {
      const key = qualifyKey(owner, name)
      if (key in row) return row[key]
    }
    // Ambiguous?
    const matches = [...scope.aliases.keys()].filter((a) => qualifyKey(a, name) in row)
    if (matches.length > 1) throw new SqlError(`ambiguous column name: ${name}`, 'ambiguous-column')
  }
  throw new SqlError(`no such column: ${table ? `${table}.` : ''}${name}`, 'no-such-column')
}

function likeMatch(value: Value, pattern: Value): boolean {
  if (value === null || pattern === null) return false
  const re = String(pattern)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.')
  return new RegExp(`^${re}$`, 'i').test(String(value))
}

function cmp(op: string, a: Value, b: Value): boolean {
  if (a === null || b === null) return false
  const an = typeof a === 'number' || typeof b === 'number' ? Number(a) : null
  const bn = typeof a === 'number' || typeof b === 'number' ? Number(b) : null
  if (an !== null && bn !== null && !Number.isNaN(an) && !Number.isNaN(bn)) {
    switch (op) {
      case '=': return an === bn
      case '<>': return an !== bn
      case '<': return an < bn
      case '>': return an > bn
      case '<=': return an <= bn
      case '>=': return an >= bn
    }
  }
  const as = String(a)
  const bs = String(b)
  switch (op) {
    case '=': return as === bs
    case '<>': return as !== bs
    case '<': return as < bs
    case '>': return as > bs
    case '<=': return as <= bs
    case '>=': return as >= bs
  }
  return false
}

function truthy(v: Value): boolean {
  if (v === null) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  const n = Number(v)
  return !Number.isNaN(n) && n !== 0
}

/** Eval context: current joined row + outer (correlated) scopes. */
export interface EvalCtx {
  db: Database
  scope: Scope
  row: Row
  outer: EvalCtx | null
}

function evalExpr(e: Expr, ctx: EvalCtx): Value {
  switch (e.kind) {
    case 'lit':
      return e.value
    case 'col': {
      try {
        return resolveCol(e.table, e.name, ctx.scope, ctx.row)
      } catch (err) {
        if (ctx.outer) return evalExpr(e, ctx.outer)
        throw err
      }
    }
    case 'not':
      return !truthy(evalExpr(e.expr, ctx))
    case 'and':
      return truthy(evalExpr(e.left, ctx)) && truthy(evalExpr(e.right, ctx))
    case 'or':
      return truthy(evalExpr(e.left, ctx)) || truthy(evalExpr(e.right, ctx))
    case 'cmp':
      return cmp(e.op, evalExpr(e.left, ctx), evalExpr(e.right, ctx))
    case 'like': {
      const ok = likeMatch(evalExpr(e.left, ctx), evalExpr(e.right, ctx))
      return e.negated ? !ok : ok
    }
    case 'isnull': {
      const v = evalExpr(e.expr, ctx)
      return e.negated ? v !== null : v === null
    }
    case 'concat': {
      let out = ''
      for (const p of e.parts) {
        const v = evalExpr(p, ctx)
        out += v === null ? '' : String(v)
      }
      return out
    }
    case 'func': {
      if (AGGREGATES.has(e.name)) {
        throw new SqlError(
          `misuse of aggregate function ${e.name}() — only allowed in the SELECT list of a non-joined aggregate query`,
          'syntax',
        )
      }
      return callScalar(
        e.name,
        e.args.map((a) => evalExpr(a, ctx)),
      )
    }
    case 'in': {
      const left = evalExpr(e.expr, ctx)
      let found = false
      if (e.list) {
        for (const item of e.list) {
          if (cmp('=', left, evalExpr(item, ctx))) {
            found = true
            break
          }
        }
      } else if (e.sub) {
        const sub = runSelect(e.sub, ctx.db, ctx)
        if (sub.columns.length !== 1) {
          throw new SqlError('subquery must return a single column for IN', 'subquery')
        }
        for (const r of sub.rows) {
          if (cmp('=', left, r[sub.columns[0]])) {
            found = true
            break
          }
        }
      }
      return e.negated ? !found : found
    }
    case 'exists': {
      const sub = runSelect(e.sub, ctx.db, ctx)
      const found = sub.rows.length > 0
      return e.negated ? !found : found
    }
    case 'subquery': {
      const sub = runSelect(e.sub, ctx.db, ctx)
      if (sub.columns.length !== 1) {
        throw new SqlError('scalar subquery must return exactly one column', 'subquery')
      }
      if (sub.rows.length > 1) {
        throw new SqlError('scalar subquery returned more than one row', 'subquery')
      }
      if (sub.rows.length === 0) return null
      return sub.rows[0][sub.columns[0]]
    }
  }
}

export function evalBool(e: Expr, ctx: EvalCtx): boolean {
  return truthy(evalExpr(e, ctx))
}

/** Public helper: evaluate a boolean expr against a flat (unqualified) row. */
export function evalBoolOnRow(e: Expr, row: Row, db?: Database): boolean {
  const scope: Scope = { aliases: new Map([['_', '_']]), bare: new Map(), order: ['_'] }
  for (const k of Object.keys(row)) scope.bare.set(k, '_')
  const flat: Row = {}
  for (const [k, v] of Object.entries(row)) {
    flat[k] = v
    flat[qualifyKey('_', k)] = v
  }
  return evalBool(e, { db: db ?? {}, scope, row: flat, outer: null })
}

export function evalValueOnRow(e: Expr, row: Row, db?: Database): Value {
  const scope: Scope = { aliases: new Map([['_', '_']]), bare: new Map(), order: ['_'] }
  for (const k of Object.keys(row)) scope.bare.set(k, '_')
  const flat: Row = {}
  for (const [k, v] of Object.entries(row)) {
    flat[k] = v
    flat[qualifyKey('_', k)] = v
  }
  return evalExpr(e, { db: db ?? {}, scope, row: flat, outer: null })
}

function tableRows(db: Database, name: string): { table: Table; rows: Row[] } {
  const table = db[name]
  if (!table) throw new SqlError(`no such table: ${name}`, 'no-such-table')
  return { table, rows: table.rows.map((r) => ({ ...r })) }
}

function prefixRow(alias: string, row: Row, columns: string[]): Row {
  const out: Row = {}
  for (const c of columns) {
    out[qualifyKey(alias, c)] = row[c] ?? null
    out[c] = row[c] ?? null // bare; ambiguous ones get overwritten — resolveCol handles that
  }
  return out
}

function mergeRows(a: Row, b: Row): Row {
  return { ...a, ...b }
}

function applyJoin(
  leftRows: Row[],
  join: JoinClause,
  db: Database,
  scope: Scope,
  outer: EvalCtx | null,
): Row[] {
  const alias = join.alias ?? join.table
  const { table, rows: rightAll } = tableRows(db, join.table)
  const out: Row[] = []
  for (const left of leftRows) {
    let matched = false
    for (const rightRaw of rightAll) {
      const right = prefixRow(alias, rightRaw, table.columns)
      const merged = mergeRows(left, right)
      const ctx: EvalCtx = { db, scope, row: merged, outer }
      if (evalBool(join.on, ctx)) {
        out.push(merged)
        matched = true
      }
    }
    if (!matched && join.type === 'left') {
      const nulls: Row = { ...left }
      for (const c of table.columns) {
        nulls[qualifyKey(alias, c)] = null
        // Only set bare null if this column isn't already present from the left
        if (!(c in left)) nulls[c] = null
      }
      out.push(nulls)
    }
  }
  return out
}

function fieldUsesAggregate(f: SelectField): boolean {
  if (f.kind === 'star') return false
  const walk = (e: Expr): boolean => {
    switch (e.kind) {
      case 'func':
        return AGGREGATES.has(e.name) || e.args.some(walk)
      case 'not':
      case 'isnull':
        return walk(e.expr)
      case 'and':
      case 'or':
      case 'cmp':
      case 'like':
        return walk(e.left) || walk(e.right)
      case 'concat':
        return e.parts.some(walk)
      case 'in':
        return walk(e.expr) || (e.list?.some(walk) ?? false)
      default:
        return false
    }
  }
  return walk(f.expr)
}

function project(
  fields: SelectField[],
  rows: Row[],
  ctxBase: Omit<EvalCtx, 'row'>,
): { columns: string[]; rows: Row[] } {
  const hasAgg = fields.some(fieldUsesAggregate)
  if (hasAgg) {
    // Single aggregate group over the whole filtered set (no GROUP BY support).
    const columns: string[] = []
    const out: Row = {}
    fields.forEach((f, i) => {
      if (f.kind === 'star') throw new SqlError('SELECT * cannot be mixed with aggregates', 'syntax')
      const name = f.alias ?? (f.expr.kind === 'col' ? f.expr.name : `col${i + 1}`)
      columns.push(name)
      if (f.expr.kind === 'func' && AGGREGATES.has(f.expr.name)) {
        if (f.expr.name === 'COUNT') {
          if (f.expr.star || f.expr.args.length === 0) out[name] = rows.length
          else {
            let n = 0
            for (const r of rows) {
              const v = evalExpr(f.expr.args[0], { ...ctxBase, row: r })
              if (v !== null) n++
            }
            out[name] = n
          }
        } else {
          throw new SqlError(`unsupported aggregate: ${f.expr.name}`, 'syntax')
        }
      } else {
        // Non-aggregate beside aggregate: take first row's value (SQLite-ish) or null
        out[name] = rows.length ? evalExpr(f.expr, { ...ctxBase, row: rows[0] }) : null
      }
    })
    return { columns, rows: [out] }
  }

  // Expand stars into concrete columns using scope order
  const expanded: { label: string; get: (r: Row) => Value }[] = []
  for (const f of fields) {
    if (f.kind === 'star') {
      const aliases = f.table ? [f.table] : ctxBase.scope.order
      for (const a of aliases) {
        const tableName = ctxBase.scope.aliases.get(a)
        if (!tableName) throw new SqlError(`no such table: ${a}`, 'no-such-table')
        const cols = ctxBase.db[tableName].columns
        for (const c of cols) {
          const label = aliases.length === 1 && !f.table ? c : qualifyKey(a, c)
          expanded.push({
            label: label.includes('.') ? label.split('.').pop()! : label,
            get: (r) => r[qualifyKey(a, c)] ?? r[c] ?? null,
          })
        }
      }
    } else {
      const label =
        f.alias ??
        (f.expr.kind === 'col' ? f.expr.name : `col${expanded.length + 1}`)
      expanded.push({
        label,
        get: (r) => evalExpr(f.expr, { ...ctxBase, row: r }),
      })
    }
  }
  // Deduplicate labels (table.col collisions → keep last / use index)
  const seen = new Map<string, number>()
  const columns = expanded.map((e) => {
    const n = (seen.get(e.label) ?? 0) + 1
    seen.set(e.label, n)
    return n === 1 ? e.label : `${e.label}_${n}`
  })
  const outRows = rows.map((r) => {
    const o: Row = {}
    expanded.forEach((e, i) => {
      o[columns[i]] = e.get(r)
    })
    return o
  })
  return { columns, rows: outRows }
}

function applyOrder(rows: Row[], columns: string[], orderBy: OrderBy | null, ctxBase: Omit<EvalCtx, 'row'>): Row[] {
  if (!orderBy) return rows
  let keyFn: (r: Row) => Value
  if (orderBy.kind === 'pos') {
    if (!Number.isInteger(orderBy.n) || orderBy.n < 1 || orderBy.n > columns.length) {
      throw new SqlError(
        `ORDER BY position ${orderBy.n} is out of range (result has ${columns.length} columns)`,
        'order-by',
      )
    }
    const col = columns[orderBy.n - 1]
    keyFn = (r) => r[col]
  } else if (orderBy.expr.kind === 'col' && !orderBy.expr.table && columns.includes(orderBy.expr.name)) {
    keyFn = (r) => r[orderBy.expr.kind === 'col' ? orderBy.expr.name : '']
  } else if (orderBy.expr.kind === 'col') {
    const name = orderBy.expr.name
    if (!columns.includes(name)) {
      throw new SqlError(`Unknown column '${name}' in 'order clause'`, 'order-by')
    }
    keyFn = (r) => r[name]
  } else {
    try {
      // Probe once on an empty/first row to surface unknown columns as order-by errors
      if (rows[0]) evalExpr(orderBy.expr, { ...ctxBase, row: rows[0] })
      keyFn = (r) => evalExpr(orderBy.expr, { ...ctxBase, row: r })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new SqlError(
        msg.startsWith('Unknown column') ? msg : `Unknown column in 'order clause' (${msg})`,
        'order-by',
      )
    }
  }
  const dir = orderBy.dir === 'DESC' ? -1 : 1
  return [...rows].sort((a, b) => {
    const av = keyFn(a)
    const bv = keyFn(b)
    if (av === bv) return 0
    if (av === null) return 1
    if (bv === null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })
}

function runCore(core: SelectCore, db: Database, outer: EvalCtx | null): QueryResult {
  if (!core.from) {
    // SELECT <exprs> with no FROM — single virtual row
    const scope: Scope = { aliases: new Map(), bare: new Map(), order: [] }
    const ctxBase = { db, scope, outer }
    const projected = project(core.fields, [{}], ctxBase)
    return { columns: projected.columns, rows: projected.rows, sources: projected.rows.map(() => 0) }
  }
  const fromAlias = core.from.alias ?? core.from.table
  const joinMeta = core.joins.map((j) => ({ alias: j.alias ?? j.table, table: j.table }))
  const scope = makeScope(fromAlias, core.from.table, joinMeta)
  fillBare(scope, db)

  const { table, rows: base } = tableRows(db, core.from.table)
  let rows = base.map((r) => prefixRow(fromAlias, r, table.columns))
  for (const j of core.joins) {
    // Extend bare map as joins are applied
    fillBare(scope, db)
    rows = applyJoin(rows, j, db, scope, outer)
  }
  if (core.where) {
    rows = rows.filter((r) => evalBool(core.where!, { db, scope, row: r, outer }))
  }
  const projected = project(core.fields, rows, { db, scope, outer })
  return {
    columns: projected.columns,
    rows: projected.rows,
    sources: projected.rows.map(() => 0),
  }
}

function rowKey(r: Row, cols: string[]): string {
  return cols.map((c) => JSON.stringify(r[c] ?? null)).join('\0')
}

export function runSelect(stmt: SelectStmt, db: Database, outer: EvalCtx | null = null): QueryResult {
  const parts = stmt.selects.map((core) => runCore(core, db, outer))
  // Column-count check across UNION arms
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].columns.length !== parts[0].columns.length) {
      throw new SqlError(
        `SELECTs to the left and right of UNION do not have the same number of result columns (${parts[0].columns.length} vs ${parts[i].columns.length})`,
        'column-count',
      )
    }
  }
  const columns = parts[0]?.columns ?? []
  let rows: Row[] = []
  let sources: number[] = []
  parts.forEach((part, si) => {
    // Remap right-side column names onto the left SELECT's names
    for (const r of part.rows) {
      const mapped: Row = {}
      columns.forEach((c, i) => {
        mapped[c] = r[part.columns[i]]
      })
      rows.push(mapped)
      sources.push(si)
    }
  })
  // Deduplicate when any UNION (not ALL) is present
  if (stmt.unionAll.some((all) => !all)) {
    // Strict: if ANY union is DISTINCT-style, dedupe the whole result (good enough for teaching)
    const seen = new Set<string>()
    const nr: Row[] = []
    const ns: number[] = []
    rows.forEach((r, i) => {
      const k = rowKey(r, columns)
      if (seen.has(k)) return
      seen.add(k)
      nr.push(r)
      ns.push(sources[i])
    })
    rows = nr
    sources = ns
  }
  const scope: Scope = { aliases: new Map(), bare: new Map(), order: [] }
  rows = applyOrder(rows, columns, stmt.orderBy, { db, scope, outer })
  return { columns, rows, sources }
}

/** Walk an expression and collect bare / qualified column references. */
export function referencedColumns(e: Expr, out: string[] = []): string[] {
  switch (e.kind) {
    case 'col':
      out.push(e.table ? `${e.table}.${e.name}` : e.name)
      break
    case 'not':
    case 'isnull':
      referencedColumns(e.expr, out)
      break
    case 'and':
    case 'or':
    case 'cmp':
    case 'like':
      referencedColumns(e.left, out)
      referencedColumns(e.right, out)
      break
    case 'func':
      for (const a of e.args) referencedColumns(a, out)
      break
    case 'concat':
      for (const p of e.parts) referencedColumns(p, out)
      break
    case 'in':
      referencedColumns(e.expr, out)
      if (e.list) for (const x of e.list) referencedColumns(x, out)
      break
    case 'exists':
    case 'subquery':
    case 'lit':
      break
  }
  return out
}
