import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { regionLabel } from '@/lib/muscleColors'
import { groupByRegion } from '@/lib/exerciseGrouping'
import type { ExerciseListItem, RecentWorkout } from '@/types'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { FilterChips } from '@/components/FilterChips'

const REGION_FILTERS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']
const MECHANIC_FILTERS = ['All', 'Compound', 'Isolation']

// One list item for an exercise, wherever one is chosen. Title and subtitle
// sit close together, the chevron says "tap me", and exercises the user
// actually trains get a thin accent line on the left -- enough to spot them
// among 800+, without turning the list into a status display (CLAUDE.md §7:
// no status or muscle colour for this).
export function ExerciseRow({ item, onClick }: { item: ExerciseListItem; onClick: () => void }) {
  return (
    <Card className="relative cursor-pointer flex-row items-center justify-between gap-2 px-3 py-2.5" onClick={onClick}>
      {item.is_used ? (
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-[3px] rounded-r-full"
          style={{ background: 'var(--brand-accent)', opacity: 0.7 }}
        />
      ) : null}
      <div className="min-w-0">
        <div className="truncate text-[13.5px] font-bold">{item.display_name}</div>
        <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{item.display_subtitle}</div>
      </div>
      <span className="shrink-0 text-muted-foreground">›</span>
    </Card>
  )
}

interface ExerciseSelectorProps {
  onSelect: (exercise: ExerciseListItem) => void
  // Already chosen elsewhere (the workout being edited) -- hidden from the list.
  excludeIds?: string[]
}

// The one way to find an exercise (BACKLOG #40). The Exercises page, the
// workout editor's picker and the dashboard used to be three different
// widgets, which read as three different libraries. Search and filters for
// anything new; "browse by workout" for what is already being trained --
// two taps instead of typing.
export function ExerciseSelector({ onSelect, excludeIds = [] }: ExerciseSelectorProps) {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('All')
  const [mechanic, setMechanic] = useState('All')
  const [exercises, setExercises] = useState<ExerciseListItem[]>([])
  const [loading, setLoading] = useState(true)
  // Separate from "no results": a failed request used to fall through to the
  // same empty list and read as "this exercise does not exist".
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [browsing, setBrowsing] = useState(false)
  const [recent, setRecent] = useState<RecentWorkout[] | null>(null)
  const [recentError, setRecentError] = useState<string | null>(null)
  const [openWorkout, setOpenWorkout] = useState<RecentWorkout | null>(null)

  useEffect(() => {
    // Responses can arrive out of order on a bad connection. Only the latest
    // request may touch the list -- a slow failure from an older keystroke
    // must not wipe the results of a newer one.
    let current = true
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (region !== 'All') params.set('region', region.toLowerCase())
      if (mechanic !== 'All') params.set('mechanic', mechanic.toLowerCase())
      const qs = params.toString()
      setLoading(true)
      api
        .get<ExerciseListItem[]>(`/exercises${qs ? `?${qs}` : ''}`)
        .then((rows) => {
          if (!current) return
          setExercises(rows)
          setError(null)
        })
        .catch((err) => {
          if (!current) return
          setExercises([])
          setError(err instanceof Error ? err.message : 'Request failed')
        })
        .finally(() => {
          if (current) setLoading(false)
        })
    }, 200)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [query, region, mechanic, reloadKey])

  useEffect(() => {
    if (!browsing || recent !== null) return
    let current = true
    api
      .get<RecentWorkout[]>('/workouts/recent?days=90')
      .then((rows) => {
        if (!current) return
        setRecent(rows)
        setRecentError(null)
      })
      .catch((err) => {
        if (current) setRecentError(err instanceof Error ? err.message : 'Request failed')
      })
    return () => {
      current = false
    }
  }, [browsing, recent, reloadKey])

  // Typing or filtering means "search" -- leave the workout path for it.
  const search = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setBrowsing(false)
  }

  const visible = exercises.filter((e) => !excludeIds.includes(e.id))
  const groups = groupByRegion(visible)

  const errorLine = (message: string) => (
    <div className="mt-6 text-center text-[12.5px] text-status-crit">
      <p>Could not load: {message}</p>
      <button
        type="button"
        className="mt-2 rounded-lg border border-border px-3 py-1.5 text-[12.5px] text-foreground"
        onClick={() => setReloadKey((k) => k + 1)}
      >
        Try again
      </button>
    </div>
  )

  return (
    <div className="flex flex-col">
      <Input placeholder="Search exercises…" value={query} onChange={(e) => search(setQuery)(e.target.value)} />
      <FilterChips className="mt-2" options={REGION_FILTERS} value={region} onChange={search(setRegion)} />
      <FilterChips className="mt-1" options={MECHANIC_FILTERS} value={mechanic} onChange={search(setMechanic)} />
      <button
        type="button"
        className="mt-2 flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2 text-left text-[12.5px] font-semibold"
        onClick={() => {
          setBrowsing((b) => !b)
          setOpenWorkout(null)
        }}
      >
        {browsing ? '‹ Back to search' : 'Browse by workout'}
        {!browsing && <span className="text-[11px] font-normal text-muted-foreground">last 3 months ›</span>}
      </button>

      {browsing ? (
        recentError !== null ? (
          errorLine(recentError)
        ) : recent === null ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : openWorkout === null ? (
          recent.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">No workout trained in the last 3 months.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-1.5">
              {recent.map((w) => (
                <Card
                  key={w.id}
                  className="cursor-pointer flex-row items-center justify-between gap-2 px-3 py-2.5"
                  onClick={() => setOpenWorkout(w)}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-bold">{w.name}</div>
                    <div className="mt-0.5 text-[10.5px] text-muted-foreground">
                      last trained {w.last_used.slice(8, 10)}.{w.last_used.slice(5, 7)}. · {w.exercise_count} exercises
                    </div>
                  </div>
                  <span className="shrink-0 text-muted-foreground">›</span>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div className="mt-3">
            <button
              type="button"
              className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
              onClick={() => setOpenWorkout(null)}
            >
              ‹ {openWorkout.name}
            </button>
            {openWorkout.exercises.every((e) => excludeIds.includes(e.id)) ? (
              <p className="mt-4 text-center text-[12.5px] text-muted-foreground">Every exercise of this workout is already in it.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {openWorkout.exercises
                  .filter((e) => !excludeIds.includes(e.id))
                  .map((item) => (
                    <ExerciseRow key={item.id} item={item} onClick={() => onSelect(item)} />
                  ))}
              </div>
            )}
          </div>
        )
      ) : (
        <>
          {loading && exercises.length === 0 && <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>}
          {!loading && error !== null && errorLine(error)}
          {!loading && error === null && exercises.length === 0 && (
            <p className="mt-6 text-center text-sm text-muted-foreground">No matches</p>
          )}
          {/* Exercises already in the workout are filtered out. Saying so beats
              an unexplained gap where the user knows an exercise should be. */}
          {!loading && error === null && exercises.length > 0 && groups.length === 0 && (
            <p className="mt-6 text-center text-sm text-muted-foreground">Every match is already in this workout.</p>
          )}
          {groups.map((group) => (
            <div key={group.region}>
              <div className="mt-4 mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {regionLabel(group.region)}
                <span className="h-px flex-1 bg-border" />
                <span>{group.items.length}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {group.items.map((item) => (
                  <ExerciseRow key={item.id} item={item} onClick={() => onSelect(item)} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
