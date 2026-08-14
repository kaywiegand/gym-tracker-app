// Fixed muscle-group colors (CLAUDE.md §7). Tailwind's scanner needs
// literal class names, so this stays a lookup table instead of building
// class strings like `bg-muscle-${region}` at runtime.
export const REGION_LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
}

export const REGION_BADGE_CLASS: Record<string, string> = {
  chest: 'bg-muscle-chest/15 text-muscle-chest',
  back: 'bg-muscle-back/15 text-muscle-back',
  shoulders: 'bg-muscle-shoulders/15 text-muscle-shoulders',
  arms: 'bg-muscle-arms/15 text-muscle-arms',
  legs: 'bg-muscle-legs/15 text-muscle-legs',
  core: 'bg-muscle-core/15 text-muscle-core',
}

export function regionLabel(region: string | null): string {
  if (!region) return 'Other'
  return REGION_LABELS[region] ?? region
}
