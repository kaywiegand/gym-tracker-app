// Epley formula (CLAUDE.md §8): 1RM ≈ weight × (1 + reps/30). Single source
// of truth for every e1RM comparison in the frontend (PR check, chart).
export function epley1RM(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30)
}
