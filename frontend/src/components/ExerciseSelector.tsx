import { useEffect, useState, type ReactNode } from 'react'
import { Search, BicepsFlexed, SlidersHorizontal } from 'lucide-react'
import { api } from '@/lib/api'
import { sortByDisplayName } from '@/lib/exerciseGrouping'
import type { ExerciseListItem, RecentWorkout } from '@/types'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FilterChips } from '@/components/FilterChips'
import { StickyHeader } from '@/components/StickyHeader'
import { cn } from '@/lib/utils'

const REGION_FILTERS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']
const MECHANIC_FILTERS = ['All', 'Compound', 'Isolation']

// Exactly one mechanism is visible at a time (#62/#63): the filter chips, a
// search input, or the browse-by-workout drill-down. 'filter' is the default.
type SelectorMode = 'filter' | 'search' | 'workout'

const MODE_META: Record<SelectorMode, { label: string; icon: typeof Search }> = {
  filter: { label: 'Filter', icon: SlidersHorizontal },
  search: { label: 'Search', icon: Search },
  workout: { label: 'Browse by workout', icon: BicepsFlexed },
}
const ALL_MODES: SelectorMode[] = ['filter', 'search', 'workout']

// One list item for an exercise, wherever one is chosen. Title and subtitle
// sit close together, the chevron says "tap me", and exercises the user
// actually trains get a thin neutral line on the left -- enough to spot them
// among 800+, without turning the list into a status display (CLAUDE.md §7:
// no status or muscle colour for this). Foreground at low opacity rather
// than --brand-accent, which is literally --muscle-chest's hex value and
// would read as "this is a chest exercise" here.
export function ExerciseRow({ item, onClick }: { item: ExerciseListItem; onClick: () => void }) {
  return (
    <Card className="relative cursor-pointer flex-row items-center justify-between gap-2 px-3 py-2.5" onClick={onClick}>
      {item.is_used ? <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-foreground/35" /> : null}
      <div className="min-w-0">
        <div className="truncate text-[13.5px] font-bold">{item.display_name}</div>
        <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{item.display_subtitle}</div>
      </div>
      <span className="shrink-0 text-muted-foreground">›</span>
    </Card>
  )
}

// All the state behind the selector, without any of its markup. Split out
// so a page that needs its own sticky layout (ExercisesPage, BACKLOG #50)
// can place the controls and the results in two different places -- e.g.
// inside its own sticky PageHeader -- while everything using the plain
// <ExerciseSelector> below keeps getting both in one piece.
function useExerciseSelectorState(excludeIds: string[]) {
  const [query, setQuery] = useState('')
  const [region, setRegionRaw] = useState('All')
  const [mechanic, setMechanicRaw] = useState('All')
  const [exercises, setExercises] = useState<ExerciseListItem[]>([])
  const [loading, setLoading] = useState(true)
  // Separate from "no results": a failed request used to fall through to the
  // same empty list and read as "this exercise does not exist".
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [mode, setMode] = useState<SelectorMode>('filter')
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
    if (mode !== 'workout' || recent !== null) return
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
  }, [mode, recent, reloadKey])

  const visible = exercises.filter((e) => !excludeIds.includes(e.id))
  const sorted = sortByDisplayName(visible)

  // Each mode is independent (#62): what you see is exactly what filters the
  // list. Leaving 'filter' resets the chips to All/Any so a stale chip
  // selection can't silently narrow search/workout results; leaving
  // 'search' clears its query for the same reason. Chips themselves can
  // only be touched while 'filter' is active, since that's the only mode
  // that renders them.
  const switchMode = (next: SelectorMode) => {
    setMode((current) => {
      if (current === next) return current
      if (current === 'search') setQuery('')
      if (current === 'filter') {
        setRegionRaw('All')
        setMechanicRaw('All')
      }
      if (next === 'workout') setOpenWorkout(null)
      return next
    })
  }

  return {
    query,
    setQuery,
    region,
    setRegion: setRegionRaw,
    mechanic,
    setMechanic: setMechanicRaw,
    exercises,
    sorted,
    loading,
    error,
    retry: () => setReloadKey((k) => k + 1),
    mode,
    switchMode,
    recent,
    recentError,
    openWorkout,
    setOpenWorkout,
  }
}

type ExerciseSelectorState = ReturnType<typeof useExerciseSelectorState>

function ErrorLine({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-6 text-center text-[12.5px] text-status-crit">
      <p>Could not load: {message}</p>
      <button type="button" className="mt-2 rounded-lg border border-border px-3 py-1.5 text-[12.5px] text-foreground" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

// Switches to one of the two currently hidden modes (#62). No "active" icon
// state is needed any more -- only hidden modes ever get a button.
function ModeButton({ mode, onClick }: { mode: SelectorMode; onClick: () => void }) {
  const { label, icon: Icon } = MODE_META[mode]
  return (
    <Button type="button" variant="outline" size="icon-sm" aria-label={label} onClick={onClick}>
      <Icon className="size-4" />
    </Button>
  )
}

// Search, the filter-chip rows and the browse-by-workout line -- the part of
// the selector a page may want pinned in its own sticky header (BACKLOG
// #50). Exactly one mechanism is visible at a time (#62/#63): the active
// mode's content sits on the left, icons for the two hidden modes on the
// right. Filter mode's content is two chip rows, so its icons stack
// vertically to match; search/workout are a single line, so their icons sit
// side by side at the same height as that line.
export function ExerciseSelectorControls({ state: s }: { state: ExerciseSelectorState }) {
  const hiddenModes = ALL_MODES.filter((m) => m !== s.mode)

  let content: ReactNode
  if (s.mode === 'filter') {
    content = (
      <div className="flex min-w-0 flex-col gap-1">
        <FilterChips options={REGION_FILTERS} value={s.region} onChange={s.setRegion} />
        <FilterChips options={MECHANIC_FILTERS} value={s.mechanic} onChange={s.setMechanic} />
      </div>
    )
  } else if (s.mode === 'search') {
    content = (
      <Input
        autoFocus
        placeholder="Search exercises…"
        value={s.query}
        onChange={(e) => s.setQuery(e.target.value)}
      />
    )
  } else {
    content = (
      <div className="flex h-8 items-center text-[12.5px] font-semibold text-muted-foreground">
        <span>Workouts</span>
        <span className="ml-1 font-normal">· last 3 months</span>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-1.5', s.mode === 'filter' ? 'items-start' : 'items-center')}>
      <div className="min-w-0 flex-1">{content}</div>
      <div className={cn('flex shrink-0 gap-1', s.mode === 'filter' ? 'flex-col' : 'flex-row items-center')}>
        {hiddenModes.map((m) => (
          <ModeButton key={m} mode={m} onClick={() => s.switchMode(m)} />
        ))}
      </div>
    </div>
  )
}

// The list itself -- either search results in one flat alphabetical list
// (#60), or the "browse by workout" drill-down, which keeps its own
// per-workout structure. Scrolls under whatever renders the controls above it.
export function ExerciseSelectorResults({
  state: s,
  onSelect,
  excludeIds = [],
}: {
  state: ExerciseSelectorState
  onSelect: (exercise: ExerciseListItem) => void
  excludeIds?: string[]
}) {
  if (s.mode === 'workout') {
    if (s.recentError !== null) return <ErrorLine message={s.recentError} onRetry={s.retry} />
    if (s.recent === null) return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
    if (s.openWorkout === null) {
      if (s.recent.length === 0) {
        return <p className="mt-6 text-center text-sm text-muted-foreground">No workout trained in the last 3 months.</p>
      }
      return (
        <div className="mt-3 flex flex-col gap-1.5">
          {s.recent.map((w) => (
            <Card
              key={w.id}
              className="cursor-pointer flex-row items-center justify-between gap-2 px-3 py-2.5"
              onClick={() => s.setOpenWorkout(w)}
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
    }
    return (
      <div className="mt-3">
        <button
          type="button"
          className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
          onClick={() => s.setOpenWorkout(null)}
        >
          ‹ {s.openWorkout.name}
        </button>
        {s.openWorkout.exercises.every((e) => excludeIds.includes(e.id)) ? (
          <p className="mt-4 text-center text-[12.5px] text-muted-foreground">Every exercise of this workout is already in it.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {s.openWorkout.exercises
              .filter((e) => !excludeIds.includes(e.id))
              .map((item) => (
                <ExerciseRow key={item.id} item={item} onClick={() => onSelect(item)} />
              ))}
          </div>
        )}
      </div>
    )
  }

  if (s.loading && s.exercises.length === 0) return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  if (!s.loading && s.error !== null) return <ErrorLine message={s.error} onRetry={s.retry} />
  if (!s.loading && s.error === null && s.exercises.length === 0) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">No matches</p>
  }
  return (
    <>
      {/* Exercises already in the workout are filtered out. Saying so beats
          an unexplained gap where the user knows an exercise should be. */}
      {s.exercises.length > 0 && s.sorted.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">Every match is already in this workout.</p>
      )}
      <div className="mt-3 flex flex-col gap-1.5">
        {s.sorted.map((item) => (
          <ExerciseRow key={item.id} item={item} onClick={() => onSelect(item)} />
        ))}
      </div>
    </>
  )
}

interface ExerciseSelectorProps {
  onSelect: (exercise: ExerciseListItem) => void
  // Already chosen elsewhere (the workout being edited) -- hidden from the list.
  excludeIds?: string[]
  // Pin search/filters/browse to the top of the nearest scrolling ancestor
  // (BACKLOG #50). On by default for the picker sheet, where this is the
  // only sticky element in play; ExercisesPage and the dashboard's exercise
  // picker instead pull ExerciseSelectorControls/Results out of this
  // component and into their own sticky header (PageHeader /
  // DashboardStickyBar), so they never use this flag at all.
  sticky?: boolean
}

// The one way to find an exercise (BACKLOG #40). The Exercises page, the
// workout editor's picker and the dashboard used to be three different
// widgets, which read as three different libraries. Chips for browsing by
// muscle/mechanic, a search icon for typing a name, a biceps icon for
// "browse by workout" -- one compact control that opens only what's needed.
export function ExerciseSelector({ onSelect, excludeIds = [], sticky = true }: ExerciseSelectorProps) {
  const state = useExerciseSelectorState(excludeIds)

  return (
    <div className="flex flex-col">
      {sticky ? (
        <StickyHeader className="-mx-4 px-4 pt-2 pb-2">
          <ExerciseSelectorControls state={state} />
        </StickyHeader>
      ) : (
        <ExerciseSelectorControls state={state} />
      )}
      <ExerciseSelectorResults state={state} onSelect={onSelect} excludeIds={excludeIds} />
    </div>
  )
}

export { useExerciseSelectorState }
