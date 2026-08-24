import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { BiaMeasurementDetail, BiaValue } from '@/types'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface BiaMeasurementDetailSheetProps {
  measurementId: string | null
  onOpenChange: (open: boolean) => void
}

function groupByCategory(values: BiaValue[]): Map<string, BiaValue[]> {
  const groups = new Map<string, BiaValue[]>()
  for (const value of values) {
    const bucket = groups.get(value.category)
    if (bucket) {
      bucket.push(value)
    } else {
      groups.set(value.category, [value])
    }
  }
  return groups
}

// Shows every bia_values row for one scan, grouped exactly like the source
// CSV's own categories -- not just the 5 curated KPI tiles. Kay: "die App
// soll den Ausdruck voll ersetzen" (the app should fully replace the need
// to look at the original printout).
export function BiaMeasurementDetailSheet({ measurementId, onOpenChange }: BiaMeasurementDetailSheetProps) {
  const [detail, setDetail] = useState<BiaMeasurementDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!measurementId) {
      setDetail(null)
      return
    }
    setLoading(true)
    api
      .get<BiaMeasurementDetail>(`/bia/measurements/${measurementId}`)
      .then(setDetail)
      .finally(() => setLoading(false))
  }, [measurementId])

  const groups = detail ? groupByCategory(detail.values) : new Map<string, BiaValue[]>()

  return (
    <Sheet open={measurementId !== null} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85%] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-[17px]">{detail ? detail.measurement.measured_at.slice(0, 10) : 'Scan detail'}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && detail && detail.values.length === 0 && (
            <p className="text-sm text-muted-foreground">No values recorded for this scan.</p>
          )}
          {Array.from(groups.entries()).map(([category, values]) => (
            <div key={category}>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{category}</div>
              <div className="flex flex-col">
                {values.map((v) => (
                  <div key={v.id} className="flex items-center justify-between border-b border-border py-1.5 last:border-b-0">
                    <span className="text-[12.5px] text-foreground/80">{v.subcategory ? `${v.subcategory} · ${v.metric}` : v.metric}</span>
                    <span className="text-[12.5px] font-semibold tabular-nums">{v.value_text ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
