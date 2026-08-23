import type { AcwrResponse } from '@/types'
import { Card } from '@/components/ui/card'

interface AcwrCardProps {
  acwr: AcwrResponse
}

// Acute:Chronic Workload Ratio (CLAUDE.md §8) -- green 0.8-1.3, otherwise a
// warning. Threshold coloring stays client-side, same pattern as the
// volume-delta coloring in TrackingPage.tsx.
export function AcwrCard({ acwr }: AcwrCardProps) {
  const tone = acwr.ratio >= 0.8 && acwr.ratio <= 1.3 ? 'text-status-good' : 'text-status-warn'
  const label = acwr.chronic_kg === 0 ? 'Not enough history yet' : acwr.ratio >= 0.8 && acwr.ratio <= 1.3 ? 'In range' : 'Outside 0.8–1.3'

  return (
    <Card className="p-3.5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">ACWR</div>
      <div className={`mt-1 text-[26px] font-bold ${tone}`}>{acwr.ratio.toFixed(2)}</div>
      <div className={`text-[12px] font-semibold ${tone}`}>{label}</div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        {Math.round(acwr.acute_kg)} kg last 7d · {Math.round(acwr.chronic_kg)} kg/week avg (28d)
      </div>
    </Card>
  )
}
