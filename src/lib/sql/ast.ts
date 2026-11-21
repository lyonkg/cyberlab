/** AST types for the scoped teaching SQL engine (shared by tokenizer, parser, evaluator). */

export type Value = string | number | boolean | null
export type Row = Record<string, Value>

export type CmpOp = '=' | '<>' | '<' | '>' | '<=' | '>='

export type Expr =
  | { kind: 'lit'; value: Value }
  | { kind: 'col'; table: string | null; name: string }
  | { kind: 'not'; expr: Expr }
  | { kind: 'and' | 'or'; left: Expr; right: Expr }
  | { kind: 'cmp'; op: CmpOp; left: Expr; right: Expr }
  | { kind: 'like'; left: Expr; right: Expr; negated: boolean }
  | { kind: 'isnull'; expr: Expr; negated: boolean }
  | { kind: 'func'; name: string; args: Expr[]; star: boolean }
  | { kind: 'concat'; parts: Expr[] }
  | { kind: 'in'; expr: Expr; list: Expr[] | null; sub: SelectStmt | null; negated: boolean }
  | { kind: 'exists'; sub: SelectStmt; negated: boolean }
  | { kind: 'subquery'; sub: SelectStmt }

export interface TableRef {
  table: string
  alias: string | null
}

export interface JoinClause {
  type: 'inner' | 'left'
  table: string
  alias: string | null
  on: Expr
}

export type SelectField =
  | { kind: 'star'; table: string | null }
  | { kind: 'expr'; expr: Expr; alias: string | null }

export type OrderBy =
  | { kind: 'pos'; n: number; dir: 'ASC' | 'DESC' }
  | { kind: 'expr'; expr: Expr; dir: 'ASC' | 'DESC' }

export interface SelectCore {
  fields: SelectField[]
  from: TableRef | null
  joins: JoinClause[]
  where: Expr | null
}

export interface SelectStmt {
  /** Named `selects` for backwards compatibility with the UNION lab/tests. */
  selects: SelectCore[]
  /** unionAll[i] describes the UNION between selects[i] and selects[i+1]. */
  unionAll: boolean[]
  orderBy: OrderBy | null
}
