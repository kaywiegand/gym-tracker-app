import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { RANGE_OPTIONS, RANGE_WEEKS, type DashboardRange } from '@/lib/dashboardRanges'
import {
  BIA_BANDED_METRICS,
  pickBanded,
  pickBiaKpi,
  type BiaKpiKey,
  type SegmentKind,
} from '@/lib/biaMetrics'
import type { BiaSeriesEntry } from '@/types'
import { FilterChips } from '@/components/FilterChips'
import { SectionDivider } from '@/components/SectionDivider'
import { SegmentedControl } from '@/components/SegmentedControl'
import { FitScoreGauge } from '@/components/FitScoreGauge'
import { KpiTile } from '@/components/KpiTile'
import { BiaRangeBar } from '@/components/BiaRangeBar'
import { BiaBandBar, type ScaleBand } from '@/components/BiaBandBar'
import { BiaSegmentBody } from '@/components/BiaSegmentBody'
import { BiaTrendChart, type BiaTrendPoint } from '@/components/BiaTrendChart'
import { BiaMeasurementDetailSheet } from '@/components/BiaMeasurementDetailSheet'
import { Card } from '@/components/ui/card'

// The categories the scan sheet itself ticks (Untergewicht / Normal /
// Übergewicht / Fettleibig), on the standard WHO thresholds.
const BMI_BANDS: ScaleBand[] = [
  { to: 18.5, label: 'Under', tone: 'warn' },
  { to: 25, label: 'Normal', tone: 'good' },
  { to: 30, label: 'Over', tone: 'warn' },
  { to: 40, label: 'Obese', tone: 'crit' },
]

// Secondary figures as tiles with their own trend line.
//
// These carried a different muscle-group colour each, which was wrong twice
// over: those hues mean a body region everywhere else in the app, and a green
// line next to a worsening number reads as approval. Per CLAUDE.md §7 colour
// is either data or status, never decoration -- so every sparkline now uses
// one neutral hue, and the only coloured thing is the change, tinted by
// whether it moved in the good direction.
//
// `better` says which way is good. 'none' = no meaningful direction (the
// device's own control target), so the delta stays neutral rather than
// pretending a smaller number is an achievement.
type Direction = 'up' | 'down' | 'none'

const DETAIL_TILES: { key: BiaKpiKey; label: string; unit?: string; decimals: number; better: Direction; hint: string }[] = [
  { key: 'leanMass', label: 'Lean mass', unit: 'kg', decimals: 1, better: 'up', hint: 'higher is better' },
  { key: 'softLeanMass', label: 'Soft lean mass', unit: 'kg', decimals: 1, better: 'up', hint: 'higher is better' },
  { key: 'bmr', label: 'BMR', unit: 'kcal', decimals: 0, better: 'up', hint: 'higher is better' },
  { key: 'waistHip', label: 'Waist–hip', decimals: 2, better: 'down', hint: 'lower is better' },
  { key: 'obesityRate', label: 'Obesity rate', unit: '%', decimals: 1, better: 'down', hint: 'lower is better' },
  // The device calls these "Fett/Muskel Kontrolle" -- the recommended change
  // to reach its target weight. "Control" says nothing; what it means is how
  // much to lose or gain, so it is labelled as the target it is.
  { key: 'fatControl', label: 'Fat target', unit: 'kg', decimals: 1, better: 'none', hint: 'change to reach target' },
  { key: 'muscleControl', label: 'Muscle target', unit: 'kg', decimals: 1, better: 'none', hint: 'change to reach target' },
]

export function BodyScope() {
  const [range, setRange] = useState<DashboardRange>('12M')
  const [segmentKind, setSegmentKind] = useState<SegmentKind>('muscle')
  const [scans, setScans] = useState<BiaSeriesEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [openMeasurementId, setOpenMeasurementId] = useState<string | null>(null)

  // One request for everything. This used to be the measurement list plus one
  // detail request per scan, all awaited before the first paint.
  useEffect(() => {
    api
      .get<BiaSeriesEntry[]>('/bia/series')
      .then(setScans)
      .finally(() => setLoading(false))
  }, [])

  const inRange = useMemo(() => {
    if (range === 'All') return scans
    const cutoff = Date.now() - RANGE_WEEKS[range] * 7 * 24 * 3600 * 1000
    return scans.filter((s) => new Date(s.measured_at).getTime() >= cutoff)
  }, [scans, range])

  const rangeSwitch = (
    <FilterChips options={[...RANGE_OPTIONS]} value={range} onChange={(v) => setRange(v as DashboardRange)} />
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {rangeSwitch}
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (scans.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {rangeSwitch}
        <Card className="p-4 text-center">
          <div className="text-[14px] font-bold">Body composition</div>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            No BIA scans imported yet — import one under Settings → Body composition.
          </p>
        </Card>
      </div>
    )
  }

  // The headline numbers always describe the newest scan IN RANGE; if the
  // range excludes everything, fall back to the newest overall and say so
  // rather than showing an empty screen.
  const rangeEmpty = inRange.length === 0
  const shown = rangeEmpty ? scans : inRange
  const latest = shown[shown.length - 1]
  const previous = shown.length > 1 ? shown[shown.length - 2] : null

  const kpi = (key: BiaKpiKey, from = latest) => pickBiaKpi(from.values, key)
  const trend: BiaTrendPoint[] = shown.map((s) => ({
    date: s.measured_at.slice(0, 10),
    weight: pickBiaKpi(s.values, 'weight'),
    muscle: pickBiaKpi(s.values, 'skeletalMuscleMass'),
    fat: pickBiaKpi(s.values, 'fatMass'),
    target: pickBiaKpi(s.values, 'targetWeight'),
    fitScore: pickBiaKpi(s.values, 'fitnessScore'),
  }))

  const delta = (key: BiaKpiKey) => {
    if (!previous) return null
    const now = kpi(key)
    const before = kpi(key, previous)
    return now === null || before === null ? null : now - before
  }

  const headline: { key: BiaKpiKey; label: string; unit: string; decimals: number; goodWhen: 'up' | 'down' }[] = [
    { key: 'weight', label: 'Weight', unit: 'kg', decimals: 1, goodWhen: 'down' },
    { key: 'skeletalMuscleMass', label: 'Muscle', unit: 'kg', decimals: 1, goodWhen: 'up' },
    { key: 'bodyFatPercent', label: 'Body fat', unit: '%', decimals: 1, goodWhen: 'down' },
    { key: 'visceralFat', label: 'Visceral', unit: '', decimals: 0, goodWhen: 'down' },
  ]

  return (
    <div className="flex flex-col gap-3">
      {rangeSwitch}

      {rangeEmpty && (
        <p className="text-[11.5px] text-muted-foreground">
          No scan in the last {range} — showing the most recent one from {latest.measured_at.slice(0, 10)}.
        </p>
      )}

      <Card className="px-3 pb-1 pt-3">
        <FitScoreGauge score={kpi('fitnessScore')} previous={previous ? kpi('fitnessScore', previous) : null} />
        <div className="grid grid-cols-4 gap-1 pb-2">
          {headline.map((h) => {
            const value = kpi(h.key)
            const d = delta(h.key)
            const good = d === null || d === 0 ? null : (d > 0) === (h.goodWhen === 'up')
            return (
              <div key={h.key} className="text-center">
                <div className="text-[15px] font-bold tabular-nums">{value !== null ? value.toFixed(h.decimals) : '—'}</div>
                <div className="text-[9.5px] uppercase tracking-wide text-muted-foreground">{h.label}</div>
                {d !== null && d !== 0 && (
                  <div
                    className="text-[10px] font-semibold tabular-nums"
                    style={{ color: good ? 'var(--status-good)' : 'var(--status-warn)' }}
                  >
                    {d > 0 ? '+' : ''}
                    {d.toFixed(h.decimals)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* The gauge above only shows the newest scan and the step from the one
          before. Whether the score has been climbing for a year or just
          bounced back is the actual question, and that needs the line. */}
      <Card className="p-3.5">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          FitScore over time
        </div>
        <BiaTrendChart points={trend} keys={['fitScore']} height={200} />
      </Card>

      <Card className="p-3.5">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Weight vs target
        </div>
        <BiaTrendChart points={trend} keys={['weight', 'target']} height={200} />
      </Card>

      <Card className="p-3.5">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Muscle vs fat
        </div>
        <BiaTrendChart points={trend} keys={['muscle', 'fat']} height={200} />
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {DETAIL_TILES.map((tile) => {
          const value = kpi(tile.key)
          const d = delta(tile.key)
          const spark = shown.map((s) => pickBiaKpi(s.values, tile.key)).filter((v): v is number => v !== null)
          const improved = d === null || d === 0 || tile.better === 'none' ? null : (d > 0) === (tile.better === 'up')
          return (
            <KpiTile
              key={tile.key}
              label={tile.label}
              value={value !== null ? value.toFixed(tile.decimals) : '—'}
              unit={tile.unit}
              trend={d !== null && d !== 0 ? `${d > 0 ? '▲ +' : '▼ '}${d.toFixed(tile.decimals)} · ${tile.hint}` : tile.hint}
              trendClassName={improved === null ? 'text-muted-foreground' : improved ? 'text-status-good' : 'text-status-warn'}
              sparkline={spark.length > 0 ? spark : [0]}
              color="var(--muted-foreground)"
            />
          )
        })}
      </div>

      <Card className="p-3.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Scan history{range !== 'All' && ` · ${shown.length} in ${range}`}
        </div>
        <div className="flex flex-col">
          {[...shown].reverse().map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setOpenMeasurementId(m.id)}
              className="flex items-center justify-between border-b border-border py-2 text-left last:border-b-0"
            >
              <span className="text-[13px] font-semibold">{m.measured_at.slice(0, 10)}</span>
              <span className="text-[12px] text-muted-foreground">full report ›</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Everything above reacts to the range switch. Everything below
          describes one single scan, so it stays put when the range changes --
          the split is called out rather than left for the reader to notice. */}
      <SectionDivider>Latest scan · {latest.measured_at.slice(0, 10)}</SectionDivider>

      <Card className="p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Segments</div>
          <SegmentedControl<SegmentKind>
            className="w-[132px]"
            value={segmentKind}
            onChange={setSegmentKind}
            options={[
              { value: 'muscle', label: 'Muscle' },
              { value: 'fat', label: 'Fat' },
            ]}
          />
        </div>
        <BiaSegmentBody values={latest.values} kind={segmentKind} />
      </Card>

      <Card className="p-3.5">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Composition vs normal
        </div>
        {BIA_BANDED_METRICS.map((m) => (
          <BiaRangeBar key={m.subcategory} label={m.label} unit={m.unit} reading={pickBanded(latest.values, m.subcategory)} />
        ))}
        <BiaBandBar label="BMI" value={kpi('bmi')} bands={BMI_BANDS} min={15} max={40} />
      </Card>

      <BiaMeasurementDetailSheet measurementId={openMeasurementId} onOpenChange={(open) => !open && setOpenMeasurementId(null)} />
    </div>
  )
}
