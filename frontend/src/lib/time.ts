// Matches the backend's gmdate('Y-m-d\TH:i:s\Z') format exactly (no
// milliseconds) so last-write-wins string comparison in BaseRepository::
// upsertRow() stays correct regardless of which side wrote a timestamp.
export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

// A session's duration is started_at -> its last logged set. ended_at is when
// the user pressed "Finish", which for a session left open and resumed days
// later is days after the training (BACKLOG #86). Anything longer than this
// is still no real session and is dropped as an outlier.
export const MAX_PLAUSIBLE_SESSION_MIN = 240
