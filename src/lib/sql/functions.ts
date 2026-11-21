/** Scalar and aggregate SQL functions supported by the teaching engine. */
import type { Value } from './ast'
import { SqlError } from './tokenizer'

export const AGGREGATES = new Set(['COUNT'])

function str(v: Value): string | null {
  if (v === null) return null
  if (typeof v === 'boolean') return v ? '1' : '0'
  return String(v)
}

function int(v: Value): number | null {
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

type Scalar = (args: Value[]) => Value

const SCALARS: Record<string, { min: number; max: number; fn: Scalar }> = {
  LOWER: { min: 1, max: 1, fn: ([a]) => str(a)?.toLowerCase() ?? null },
  UPPER: { min: 1, max: 1, fn: ([a]) => str(a)?.toUpperCase() ?? null },
  LENGTH: { min: 1, max: 1, fn: ([a]) => (str(a) === null ? null : str(a)!.length) },
  /** SQLite semantics: 1-based start; negative start counts from the end. */
  SUBSTR: {
    min: 2,
    max: 3,
    fn: ([s, start, len]) => {
      const text = str(s)
      const st = int(start)
      if (text === null || st === null) return null
      let from = st > 0 ? st - 1 : st < 0 ? Math.max(text.length + st, 0) : 0
      let count = len === undefined ? text.length : int(len)
      if (count === null) return null
      if (st === 0 && count > 0) count -= 1 // SQLite: position 0 eats one char of length
      if (count < 0) {
        from = Math.max(from + count, 0)
        count = -count
      }
      return text.substr(from, count)
    },
  },
  CONCAT: { min: 1, max: 32, fn: (args) => args.map((a) => str(a) ?? '').join('') },
  ASCII: {
    min: 1,
    max: 1,
    fn: ([a]) => {
      const t = str(a)
      return t === null || t.length === 0 ? null : t.charCodeAt(0)
    },
  },
}
SCALARS.SUBSTRING = SCALARS.SUBSTR
SCALARS.UNICODE = SCALARS.ASCII

export const SUPPORTED_FUNCTIONS = [...Object.keys(SCALARS), ...AGGREGATES].sort()

export function callScalar(name: string, args: Value[]): Value {
  const f = SCALARS[name]
  if (!f) throw new SqlError(`no such function: ${name}`, 'syntax')
  if (args.length < f.min || args.length > f.max) {
    throw new SqlError(`wrong number of arguments to function ${name}()`, 'syntax')
  }
  return f.fn(args)
}

export function isKnownFunction(name: string): boolean {
  return name in SCALARS || AGGREGATES.has(name)
}
