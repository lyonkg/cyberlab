/**
 * In-memory demo database for the SQLi labs. All data is intentionally fake teaching data.
 */
import type { Row } from './ast'

export interface SimulatedUser {
  id: number
  username: string
  password: string
  role: string
}

/** Intentionally fake in-memory demo accounts for the SQLi teaching lab only. Not real credentials. */
export const DEMO_USERS: SimulatedUser[] = [
  { id: 1, username: 'alice', password: 'wonderland', role: 'user' },
  { id: 2, username: 'bob', password: 'builder', role: 'user' },
  { id: 3, username: 'admin', password: 's3cret!', role: 'admin' },
]

export interface Product {
  id: number
  title: string
  body: string
}

/** Demo "news / product" table used by the UNION and blind labs. Three columns. */
export const DEMO_PRODUCTS: Product[] = [
  { id: 1, title: 'Bienvenue', body: 'Actualités CyberLab : les leçons SQLi simulées sont en ligne.' },
  { id: 2, title: 'Patch Tuesday', body: 'Pensez à appliquer rapidement les mises à jour de sécurité.' },
  { id: 3, title: 'Déploiement MFA', body: 'Activez un second facteur sur tous les comptes possibles.' },
]

export interface Order {
  id: number
  user_id: number
  item: string
  total: number
  ship_to: string
}

/** Orders joined to users in the order-lookup (JOIN) lab. */
export const DEMO_ORDERS: Order[] = [
  { id: 1001, user_id: 1, item: 'Clé de sécurité matérielle', total: 49, ship_to: '12 allée du Terrier' },
  { id: 1002, user_id: 2, item: 'Perceuse sans fil', total: 89, ship_to: '7 rue des Chantiers' },
  { id: 1003, user_id: 3, item: 'Serveur en rack', total: 1299, ship_to: '1 place des Admins' },
  { id: 1004, user_id: 1, item: 'Filtre de confidentialité', total: 25, ship_to: '12 allée du Terrier' },
]

/** A "hidden" table the lab UI never queries — attackers discover it with EXISTS/IN probes. */
export const DEMO_API_KEYS = [
  { id: 1, owner_id: 3, api_key: 'DEMO-ONLY-ak_9f2c-not-real' },
]

export interface Table {
  columns: string[]
  rows: Row[]
}

export type Database = Record<string, Table>

function table<T extends object>(columns: string[], rows: T[]): Table {
  return { columns, rows: rows.map((r) => ({ ...(r as Record<string, never>) })) }
}

export function createDemoDb(overrides: Partial<Database> = {}): Database {
  return {
    users: table(['id', 'username', 'password', 'role'], DEMO_USERS),
    products: table(['id', 'title', 'body'], DEMO_PRODUCTS),
    orders: table(['id', 'user_id', 'item', 'total', 'ship_to'], DEMO_ORDERS),
    api_keys: table(['id', 'owner_id', 'api_key'], DEMO_API_KEYS),
    ...overrides,
  } as Database
}
