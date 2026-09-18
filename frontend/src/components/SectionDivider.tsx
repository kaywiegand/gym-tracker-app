import type { ReactNode } from 'react'

// Marks a hard break between two groups of cards on the same scope that
// don't share a filter (e.g. range-driven vs. always-current-week --
// OverviewScope, BodyScope). Neutral chrome only, no status or muscle
// colour (CLAUDE.md §7) -- this is structure, not data. A shared component
// rather than repeating the line/label/line markup so every divider on the
// dashboard looks identical; do not confuse it with the small uppercase
// card-title headings inside a Card, which stay as-is.
export function SectionDivider({ children }: { children: ReactNode }) {
  return (
    <div className="my-2 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[12px] font-bold uppercase tracking-wide text-foreground">{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
