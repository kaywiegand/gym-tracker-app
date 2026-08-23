import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Bodyweight, Session, SetEntry } from '@/types'

export type LocalSession = Session & { synced: boolean }
export type LocalSet = SetEntry & { synced: boolean }
export type LocalBodyweight = Bodyweight & { synced: boolean }

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

// A session with no ended_at is either still in progress or was abandoned
// (browser closed / navigated away mid-workout without hitting "Finish").
// Sets are already durable in IndexedDB the moment they're logged (CLAUDE.md
// §2) -- this just finds the session so the UI can offer to resume it
// instead of silently orphaning it under a brand new session id.
export async function findOpenSession(workoutId: string): Promise<LocalSession | undefined> {
  const sessions = await getAllRows<LocalSession>('sessions')
  return sessions
    .filter((s) => s.workout_id === workoutId && s.ended_at === null && s.deleted_at === null)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]
}

export async function getSetsForSession(sessionId: string): Promise<LocalSet[]> {
  const sets = await getAllRows<LocalSet>('sets')
  return sets.filter((s) => s.session_id === sessionId && s.deleted_at === null)
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
