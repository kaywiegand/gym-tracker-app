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
import { currentBmi, profileHeightCm } from '@/lib/bodyProfile'
import { formatNumber } from '@/lib/format'
import type { BiaSeriesEntry, Bodyweight, Settings } from '@/types'
import { FilterChips } from '@/components/FilterChips'
import { DashboardStickyBar } from '@/components/dashboard/DashboardStickyBar'
import { SectionDivider } from '@/components/SectionDivider'
import { SegmentedControl } from '@/components/SegmentedControl'
import { FitScoreGauge } from '@/components/FitScoreGauge'
import { BiaRangeBar } from '@/components/BiaRangeBar'
import { BiaBandBar, type ScaleBand } from '@/components/BiaBandBar'
import { BiaSegmentBody } from '@/components/BiaSegmentBody'
import { BiaTrendChart, type BiaTrendPoint } from '@/components/BiaTrendChart'
import { BiaMeasurementDetailSheet } from '@/components/BiaMeasurementDetailSheet'
import { Card } from '@/components/ui/card'
import { TileHeader } from '@/components/TileHeader'

// The categories the scan sheet itself ticks (Untergewicht / Normal /
// Übergewicht / Fettleibig), on the standard WHO thresholds.
const BMI_BANDS: ScaleBand[] = [
  { to: 18.5, label: 'Under', tone: 'warn' },
  { to: 25, label: 'Normal', tone: 'good' },
  { to: 30, label: 'Over', tone: 'warn' },
  { to: 40, label: 'Obese', tone: 'crit' },
]

export function BodyScope() {
  const [range, setRange] = useState<DashboardRange>('12M')
  const [segmentKind, setSegmentKind] = useState<SegmentKind>('muscle')
  const [scans, setScans] = useState<BiaSeriesEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [openMeasurementId, setOpenMeasurementId] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loggedWeight, setLoggedWeight] = useState<Bodyweight | null>(null)

  // Only feeds the BMI -- if either request fails the scan's own BMI stands.
  useEffect(() => {
    api.get<Settings>('/settings').then(setSettings).catch(() => {})
    api
      .get<Bodyweight[]>('/bodyweight?limit=1')
      .then((rows) => setLoggedWeight(rows[0] ?? null))
      .catch(() => {})
  }, [])

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
    <DashboardStickyBar>
      <FilterChips options={[...RANGE_OPTIONS]} value={range} onChange={(v) => setRange(v as DashboardRange)} />
    </DashboardStickyBar>
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
  // Always against the newest scan overall: a weight logged since then makes
  // the BMI current even when the last scan is months old.
  const newestScan = scans[scans.length - 1]
  const bmi = currentBmi({
    scanBmi: kpi('bmi'),
    scanDate: newestScan.measured_at,
    heightCm: profileHeightCm(settings) ?? pickBiaKpi(newestScan.values, 'height'),
    loggedWeight,
  })
  const trend: BiaTrendPoint[] = shown.map((s) => ({
    date: s.measured_at.slice(0, 10),
    weight: pickBiaKpi(s.values, 'weight'),
    muscle: pickBiaKpi(s.values, 'skeletalMuscleMass'),
    fat: pickBiaKpi(s.values, 'fatMass'),
    leanMass: pickBiaKpi(s.values, 'leanMass'),
    target: pickBiaKpi(s.values, 'targetWeight'),
    fitScore: pickBiaKpi(s.values, 'fitnessScore'),
  }))

  // The device's own recommendation ("Fett Kontrolle"): kg of fat to lose or gain.
  const fatTarget = kpi('fatControl')

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

      {/* One line, always there: the message about an empty range used to
          appear only then and moved everything below it (BACKLOG #141). */}
      <p className="h-[17px] truncate text-[11.5px] text-muted-foreground">
        {rangeEmpty
          ? `No scan in ${range === 'All' ? 'any range' : `the last ${range}`} — showing the latest, ${latest.measured_at.slice(0, 10)}.`
          : `${inRange.length} ${inRange.length === 1 ? 'scan' : 'scans'} ${range === 'All' ? 'in total' : `in the last ${range}`}.`}
      </p>

      {/* The gauge further down only shows the newest scan and the step from
          the one before. Whether the score has been climbing for a year or
          just bounced back is the actual question, and that needs the line. */}
      <Card className="gap-0 p-3.5">
        <TileHeader title="FitScore" subline="Trend over the selected period" className="mb-1" />
        <BiaTrendChart points={trend} keys={['fitScore']} height={200} />
      </Card>

      <Card className="gap-0 p-3.5">
        <TileHeader title="Weight" subline="Against your target weight" className="mb-1" />
        <BiaTrendChart points={trend} keys={['weight', 'target']} height={200} />
      </Card>

      <Card className="gap-0 p-3.5">
        <TileHeader title="Body composition" subline="Muscle, fat and lean mass over time" className="mb-1" />
        {/* Nivo lists the legend in reverse key order -- lean mass first here puts it last there. */}
        <BiaTrendChart points={trend} keys={['leanMass', 'muscle', 'fat']} height={200} />
      </Card>

      {/* Everything above reacts to the range switch. Everything below
          describes one single scan, so it stays put when the range changes --
          the split is called out rather than left for the reader to notice.
          The scan history at the very end is the list of scans in range. */}
      <SectionDivider>Latest scan · {latest.measured_at.slice(0, 10)}</SectionDivider>

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
                {/* The delta line keeps its height without a delta (the newest scan in range changes with the range). */}
                <div className="h-[15px] text-[10px] font-semibold tabular-nums" style={{ color: good ? 'var(--status-good)' : 'var(--status-warn)' }}>
                  {d !== null && d !== 0 && (
                    <>
                      {d > 0 ? '+' : ''}
                      {d.toFixed(h.decimals)}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="h-[27px] text-center text-[11px] text-muted-foreground">
          {fatTarget !== null && fatTarget !== 0 && (
            <>
              Fat target: {fatTarget > 0 ? '+' : ''}
              {fatTarget.toFixed(1)} kg
            </>
          )}
        </p>
      </Card>

      <Card className="gap-0 p-3.5">
        <TileHeader
          title="Segments"
          subline="Muscle or fat per body segment"
          aside={
            <SegmentedControl<SegmentKind>
              className="w-[132px]"
              value={segmentKind}
              onChange={setSegmentKind}
              options={[
                { value: 'muscle', label: 'Muscle' },
                { value: 'fat', label: 'Fat' },
              ]}
            />
          }
        />
        <BiaSegmentBody values={latest.values} kind={segmentKind} />
      </Card>

      <Card className="gap-0 p-3.5">
        <TileHeader title="Composition vs. normal" subline="Each value against the scan's normal range" className="mb-1" />
        {BIA_BANDED_METRICS.map((m) => (
          <BiaRangeBar key={m.subcategory} label={m.label} unit={m.unit} reading={pickBanded(latest.values, m.subcategory)} />
        ))}
        <BiaBandBar
          label="BMI"
          value={bmi.value}
          caption={bmi.basis ? `${formatNumber(bmi.basis.weightKg, 1)} kg · ${bmi.basis.date}` : undefined}
          bands={BMI_BANDS}
          min={15}
          max={40}
        />
      </Card>

      <Card className="gap-0 p-3.5">
        <TileHeader
          title="Scan history"
          subline={`${shown.length} ${shown.length === 1 ? 'scan' : 'scans'}${range !== 'All' ? ` in ${range}` : ''}`}
        />
        {/* Last tile, so it may grow and shrink with the range (BACKLOG #141). */}
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

      <BiaMeasurementDetailSheet measurementId={openMeasurementId} onOpenChange={(open) => !open && setOpenMeasurementId(null)} />
    </div>
  )
}
