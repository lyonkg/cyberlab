/**
 * Compatibility façade for the teaching SQL engine.
 * Implementation lives in ./sql/* — this file keeps the historical public API stable
 * so existing labs and tests continue to import from './sqli'.
 */
export type {
  SimulatedUser,
  SqliResult,
  Value,
  Row,
  Expr,
  Keyword,
  SqlErrorKind,
} from './sql'
export {
  DEMO_USERS,
  SqlError,
  SqlSyntaxError,
  tokenize,
  statementTokens,
  stripComments,
  TokenStream,
  parseExpr,
  parseWhere,
  referencedColumns,
  runWhere,
  detectInjection,
  simulateLogin,
} from './sql'

import type { Expr, Row, Value } from './sql'
import { evalBoolOnRow, evalValueOnRow } from './sql'

/** Flat-row helpers kept for older call sites (sqlSelect used these before the refactor). */
export function evalValue(e: Expr, row: Row): Value {
  return evalValueOnRow(e, row)
}
export function evalBool(e: Expr, row: Row): boolean {
  return evalBoolOnRow(e, row)
}
