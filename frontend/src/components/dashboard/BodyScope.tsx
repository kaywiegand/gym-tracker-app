import { useState } from 'react'
import { RANGE_OPTIONS, type DashboardRange } from '@/lib/dashboardRanges'
import { FilterChips } from '@/components/FilterChips'
import { Card } from '@/components/ui/card'

// Placeholder -- body composition (skeletal muscle, body fat, FitScore-style
// KPIs) needs BIA import data, which doesn't exist yet (Stage 5). The range
// switch is wired up now for UI consistency with the other three scopes,
// even though nothing reacts to it yet.
export function BodyScope() {
  const [range, setRange] = useState<DashboardRange>('3M')

  return (
    <div className="flex flex-col gap-3">
      <FilterChips options={[...RANGE_OPTIONS]} value={range} onChange={(v) => setRange(v as DashboardRange)} />
      <Card className="p-4 text-center">
        <div className="text-[14px] font-bold">Body composition</div>
        <p className="mt-1.5 text-[12.5px] text-muted-foreground">
          Needs BIA import data (skeletal muscle, body fat, visceral fat) — coming with Stage 5.
        </p>
      </Card>
    </div>
  )
}
