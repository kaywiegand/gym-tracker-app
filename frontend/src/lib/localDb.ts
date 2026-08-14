import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export interface LocalSession {
  id: string
  workout_id: string | null
  started_at: string
  ended_at: string | null
  note: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  synced: boolean
}

export interface LocalSet {
  id: string
  session_id: string
  exercise_id: string
  workout_exercise_id: string | null
  set_index: number
  weight_kg: number
  reps: number
  is_warmup: number
  rpe: number | null
  performed_at: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  synced: boolean
}

export interface LocalBodyweight {
  id: string
  measured_at: string
  weight_kg: number
  note: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  synced: boolean
}

interface GymTrackerDB extends DBSchema {
  sessions: { key: string; value: LocalSession }
  sets: { key: string; value: LocalSet }
  bodyweight: { key: string; value: LocalBodyweight }
}

export type StoreName = 'sessions' | 'sets' | 'bodyweight'

let dbPromise: Promise<IDBPDatabase<GymTrackerDB>> | null = null

// Every write goes here first (CLAUDE.md §2: "jede Eingabe wird zuerst
// lokal gespeichert"). No indexes -- data volume per user is small
// (their own sets/sessions/bodyweight), so getAll()+filter for the sync
// queue is simpler than fighting IndexedDB's key-type restrictions
// (booleans aren't valid index keys).
function getDb(): Promise<IDBPDatabase<GymTrackerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<GymTrackerDB>('gym-tracker', 1, {
      upgrade(db) {
        db.createObjectStore('sessions', { keyPath: 'id' })
        db.createObjectStore('sets', { keyPath: 'id' })
        db.createObjectStore('bodyweight', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export async function putRow<T extends { id: string }>(store: StoreName, row: T): Promise<void> {
  const db = await getDb()
  await db.put(store, row as never)
}

export async function getRow<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await getDb()
  return (await db.get(store, id)) as T | undefined
}

export async function getAllRows<T>(store: StoreName): Promise<T[]> {
  const db = await getDb()
  return (await db.getAll(store)) as T[]
}

export async function getUnsynced<T extends { synced: boolean }>(store: StoreName): Promise<T[]> {
  const rows = await getAllRows<T>(store)
  return rows.filter((r) => !r.synced)
}

export async function markSynced(store: StoreName, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = await getDb()
  const tx = db.transaction(store, 'readwrite')
  for (const id of ids) {
    const row = await tx.store.get(id)
    if (row) {
      await tx.store.put({ ...row, synced: true } as never)
    }
  }
  await tx.done
}
