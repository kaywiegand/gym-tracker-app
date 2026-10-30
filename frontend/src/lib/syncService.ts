import { api } from '@/lib/api'
import { getUnsynced, markSynced, type LocalBodyMeasurement, type LocalBodyweight, type LocalSession, type LocalSet } from '@/lib/localDb'

let running: Promise<void> | null = null
let pushAgain = false

function stripSynced<T extends { synced: boolean }>(row: T): Omit<T, 'synced'> {
  const { synced: _synced, ...rest } = row
  return rest
}

// Push-only sync (CLAUDE.md §4): reads whatever hasn't been pushed yet from
// IndexedDB and POSTs it in one go. On success, marks those rows synced.
// On failure (offline, server error) rows stay queued -- the next trigger
// (online event, app start, "Finish workout") just tries again. No retry
// backoff scheduler; that's more machinery than this scope needs.
async function pushOnce(): Promise<boolean> {
  try {
    const [sessions, sets, bodyweight, bodyMeasurements] = await Promise.all([
      getUnsynced<LocalSession>('sessions'),
      getUnsynced<LocalSet>('sets'),
      getUnsynced<LocalBodyweight>('bodyweight'),
      getUnsynced<LocalBodyMeasurement>('body_measurements'),
    ])

    if (sessions.length === 0 && sets.length === 0 && bodyweight.length === 0 && bodyMeasurements.length === 0) {
      return true
    }

    await api.post('/sync/push', {
      sessions: sessions.map(stripSynced),
      sets: sets.map(stripSynced),
      bodyweight: bodyweight.map(stripSynced),
      body_measurements: bodyMeasurements.map(stripSynced),
    })

    await Promise.all([
      markSynced('sessions', sessions),
      markSynced('sets', sets),
      markSynced('bodyweight', bodyweight),
      markSynced('body_measurements', bodyMeasurements),
    ])
    return true
  } catch {
    // left queued for the next trigger
    return false
  }
}

// One run at a time. A trigger during a run is remembered and answered right
// after it -- dropping it left e.g. "Finish workout" unsent until the next
// app start.
export function pushPending(): Promise<void> {
  if (!navigator.onLine) {
    return Promise.resolve()
  }
  if (running) {
    pushAgain = true
    return running
  }
  running = (async () => {
    try {
      let succeeded: boolean
      do {
        pushAgain = false
        succeeded = await pushOnce()
      } while (succeeded && pushAgain)
    } finally {
      running = null
    }
  })()
  return running
}

export function initSyncListeners(): void {
  window.addEventListener('online', () => {
    pushPending()
  })
}
