import { api } from '@/lib/api'
import { getUnsynced, markSynced, type LocalBodyMeasurement, type LocalBodyweight, type LocalSession, type LocalSet } from '@/lib/localDb'

let syncing = false

function stripSynced<T extends { synced: boolean }>(row: T): Omit<T, 'synced'> {
  const { synced: _synced, ...rest } = row
  return rest
}

// Push-only sync (CLAUDE.md §4): reads whatever hasn't been pushed yet from
// IndexedDB and POSTs it in one go. On success, marks those rows synced.
// On failure (offline, server error) rows stay queued -- the next trigger
// (online event, app start, "Finish workout") just tries again. No retry
// backoff scheduler; that's more machinery than this scope needs.
export async function pushPending(): Promise<void> {
  if (syncing || !navigator.onLine) {
    return
  }
  syncing = true
  try {
    const [sessions, sets, bodyweight, bodyMeasurements] = await Promise.all([
      getUnsynced<LocalSession>('sessions'),
      getUnsynced<LocalSet>('sets'),
      getUnsynced<LocalBodyweight>('bodyweight'),
      getUnsynced<LocalBodyMeasurement>('body_measurements'),
    ])

    if (sessions.length === 0 && sets.length === 0 && bodyweight.length === 0 && bodyMeasurements.length === 0) {
      return
    }

    await api.post('/sync/push', {
      sessions: sessions.map(stripSynced),
      sets: sets.map(stripSynced),
      bodyweight: bodyweight.map(stripSynced),
      body_measurements: bodyMeasurements.map(stripSynced),
    })

    await Promise.all([
      markSynced('sessions', sessions.map((s) => s.id)),
      markSynced('sets', sets.map((s) => s.id)),
      markSynced('bodyweight', bodyweight.map((s) => s.id)),
      markSynced('body_measurements', bodyMeasurements.map((s) => s.id)),
    ])
  } catch {
    // left queued for the next trigger
  } finally {
    syncing = false
  }
}

export function initSyncListeners(): void {
  window.addEventListener('online', () => {
    pushPending()
  })
}
