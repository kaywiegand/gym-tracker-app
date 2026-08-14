// Matches the backend's gmdate('Y-m-d\TH:i:s\Z') format exactly (no
// milliseconds) so last-write-wins string comparison in BaseRepository::
// upsertRow() stays correct regardless of which side wrote a timestamp.
export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}
