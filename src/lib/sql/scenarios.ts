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
import { SqlError, stripComments, type SqlErrorKind } from './tokenizer'
import { evalBoolOnRow } from './evaluator'

/**
 * French explanation shown next to a raw database error. The raw message itself stays in
 * English on purpose: it mimics what a real DBMS (SQLite/MySQL) prints, which is what
 * attackers actually see and search for.
 */
export function explainSqlErrorFr(kind: SqlErrorKind | undefined): string {
  switch (kind) {
    case 'column-count':
      return 'Les deux SELECT du UNION ne renvoient pas le même nombre de colonnes.'
    case 'order-by':
      return 'ORDER BY désigne une colonne qui n’existe pas dans le résultat (position trop grande ou nom inconnu).'
    case 'no-such-column':
      return 'La requête cite une colonne qui n’existe pas.'
    case 'no-such-table':
      return 'La requête cite une table qui n’existe pas.'
    case 'ambiguous-column':
      return 'Le nom de colonne existe dans plusieurs tables jointes : préfixez-le (ex. u.id).'
    case 'subquery':
      return 'La sous-requête est invalide (par ex. une sous-requête scalaire qui renvoie plusieurs colonnes).'
    case 'stacked':
      return 'Les requêtes empilées (plusieurs instructions séparées par ;) sont refusées par ce moteur.'
    default:
      return 'Erreur de syntaxe : la requête construite n’est plus du SQL valide (apostrophe non fermée, mot-clé mal placé…).'
  }
}


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
        ? `Bienvenue, ${rows[0].username} ! (requête paramétrée sûre)`
        : injectionDetected
          ? 'Tentative d’injection neutralisée — les saisies sont liées comme de simples valeurs : les apostrophes et -- ne sont que des caractères.'
          : 'Identifiants invalides.',
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
      message: `Erreur de base de données : ${msg}. ${explainSqlErrorFr(e instanceof SqlError ? e.kind : undefined)} (Afficher des erreurs SQL brutes comme celle-ci aide les attaquants à affiner leurs payloads.)`,
    }
  }
  const loggedIn = rows.length > 0
  const bypassed = loggedIn && !legit
  let message: string
  if (!loggedIn) {
    message = injectionDetected
      ? "La requête s’est exécutée mais n’a renvoyé aucune ligne. Rappel sur la priorité SQL : AND est prioritaire sur OR, donc la vérification du mot de passe peut toujours s’appliquer. Essayez de mettre la suite en commentaire avec --."
      : 'Identifiants invalides.'
  } else if (bypassed) {
    message =
      rows.length > 1
        ? `Injection réussie ! La clause WHERE a renvoyé ${rows.length} utilisateurs — connecté avec la première ligne « ${rows[0].username} » sans mot de passe valide.`
        : `Injection réussie ! Connecté en tant que « ${rows[0].username} » sans le bon mot de passe.`
  } else {
    message = `Bienvenue, ${rows[0].username} !`
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
        ? 'Tentative d’injection neutralisée — le motif LIKE est une valeur liée : UNION / ORDER BY / JOIN / sous-requêtes ne deviennent jamais du SQL.'
        : rows.length
          ? `${rows.length} produit(s) trouvé(s).`
          : 'Aucun produit ne correspond.',
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
        ? `UNION réussi — ${leakedRowIndexes.length} ligne(s) d’une autre table ajoutée(s) au résultat. Regardez les lignes surlignées.`
        : result.rows.length
          ? `Requête OK — ${result.rows.length} ligne(s) de products.`
          : 'Requête OK — 0 ligne.',
    }
  } catch (e) {
    const err = e instanceof SqlError ? e : new SqlError(String(e))
    let tip = ''
    if (err.kind === 'column-count') {
      tip = ` Indice : le SELECT de gauche renvoie ${columnCount} colonnes (${PRODUCT_COLUMNS.join(', ')}), donc chaque UNION SELECT doit renvoyer exactement ${columnCount} expressions.`
    } else if (err.kind === 'order-by') {
      tip = ` Indice : essayez ORDER BY 1, ORDER BY 2, … jusqu’à l’erreur — le dernier succès donne le nombre de colonnes (${columnCount}).`
    } else if (err.kind === 'syntax') {
      tip = ' Indice : une apostrophe seule ou un UNION cassé provoque souvent une erreur de syntaxe — les attaquants exploitent aussi ce retour.'
    } else if (err.kind === 'no-such-table') {
      tip = ' Indice : les sous-requêtes EXISTS/IN sur une table inconnue échouent — c’est en soi un oracle utile.'
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
      message: `Erreur de base de données : ${err.message}. ${explainSqlErrorFr(err.kind)}${tip}`,
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
        ? 'Tentative d’injection neutralisée — le numéro de commande est un paramètre lié : OR / JOIN / UNION ne deviennent jamais du SQL.'
        : rows.length
          ? `${rows.length} commande(s) trouvée(s).`
          : 'Aucune commande avec ce numéro.',
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
        ? `L’injection a élargi le résultat du JOIN — ${result.rows.length} ligne(s), dont les commandes et adresses de livraison d’autres utilisateurs.`
        : result.rows.length
          ? `Requête OK — ${result.rows.length} commande(s).`
          : 'Requête OK — 0 ligne.',
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
      message: `Erreur de base de données : ${err.message}. ${explainSqlErrorFr(err.kind)}`,
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
 * Blind boolean lab reuses the product search page. A matching product ("Bienvenue")
 * is the true-oracle; no rows means the injected condition was false (or an error).
 */
export function simulateBlind(input: string, vulnerable: boolean): BlindResult {
  input = clampLength(input, LIMITS.sqlInput)
  const injectionDetected = detectInjection(input)
  const base = simulateSearch(input.length ? input : 'Bienvenue', vulnerable)
  // For the blind lab, start from a known hit unless the user already typed a full payload
  const searchInput = input.includes("'") ? input : `Bienvenue${input}`
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
          ? `Oracle booléen VRAI — ${r.rows.length} produit(s) renvoyé(s) (la condition injectée est vraie).`
          : r.message
        : r.vulnerable && injectionDetected
          ? 'Oracle booléen FAUX — 0 ligne (la condition injectée est fausse, ou a tout filtré).'
          : r.message,
  }
}
