// Plateau detection (CLAUDE.md §8, "Differenzierer"): flag when e1RM hasn't
// grown over the last N sessions (N configurable in Settings, default 4).
// Compares the current e1RM against the value from exactly N sessions
// before it -- a direct reading of "kein e1RM-Zuwachs über N Sessions".
export function detectPlateau(history: { best_e1rm: number }[], thresholdSessions: number): boolean {
  if (thresholdSessions < 1 || history.length < thresholdSessions + 1) {
    return false
  }
  const current = history[history.length - 1].best_e1rm
  const reference = history[history.length - 1 - thresholdSessions].best_e1rm
  return current <= reference
}
