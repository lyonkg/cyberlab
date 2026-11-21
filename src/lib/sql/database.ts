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
  { id: 1, title: 'Welcome', body: 'CyberLab news: simulated SQLi lessons are live.' },
  { id: 2, title: 'Patch Tuesday', body: 'Remember to apply security updates promptly.' },
  { id: 3, title: 'MFA rollout', body: 'Enable a second factor on every account you can.' },
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
  { id: 1001, user_id: 1, item: 'Hardware security key', total: 49, ship_to: '12 Rabbit Hole Ln' },
  { id: 1002, user_id: 2, item: 'Cordless drill', total: 89, ship_to: '7 Scaffold St' },
  { id: 1003, user_id: 3, item: 'Rack server', total: 1299, ship_to: '1 Admin Plaza' },
  { id: 1004, user_id: 1, item: 'Privacy screen', total: 25, ship_to: '12 Rabbit Hole Ln' },
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
