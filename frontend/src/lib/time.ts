// Matches the backend's gmdate('Y-m-d\TH:i:s\Z') format exactly (no
// milliseconds) so last-write-wins string comparison in BaseRepository::
// upsertRow() stays correct regardless of which side wrote a timestamp.
export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

// Timestamps only resolve to the second, and the server ignores a write that
// is not newer. A second write to the same row within that second (a set
// checked and unchecked again) has to sort later, or it never arrives.
export function laterThan(previous: string | undefined): string {
  const now = nowIso()
  if (previous === undefined || now > previous) return now
  return new Date(new Date(previous).getTime() + 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

// A session's duration is started_at -> its last logged set. ended_at is when
// the user pressed "Finish", which for a session left open and resumed days
// later is days after the training (BACKLOG #86). Anything longer than this
// is still no real session and is dropped as an outlier.
export const MAX_PLAUSIBLE_SESSION_MIN = 240
