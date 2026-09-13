import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { regionLabel } from '@/lib/muscleColors'
import { groupByRegion } from '@/lib/exerciseGrouping'
import type { Exercise, ExerciseListItem } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { FilterChips } from '@/components/FilterChips'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ExerciseDetailSheet } from '@/components/ExerciseDetailSheet'

const REGION_FILTERS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']
const MECHANIC_FILTERS = ['All', 'Compound', 'Isolation']

// Second line: the common gym name. The structured first line already carries
// muscle and equipment, so repeating them here would be noise.
function cardSubtitle(item: ExerciseListItem): string {
  return item.display_subtitle
}

export function ExercisesPage() {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('All')
  const [mechanic, setMechanic] = useState('All')
  const [exercises, setExercises] = useState<ExerciseListItem[]>([])
  const [loading, setLoading] = useState(true)
  // Separate from "no results": a failed request used to fall through to the
  // same empty list, so a dropped connection or an expired session in the gym
  // read as "this exercise does not exist".
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const navigate = useNavigate()

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

  const groups = groupByRegion(exercises)

  async function handleDuplicated(detail: Exercise) {
    const newId = crypto.randomUUID()
    await api.post('/exercises', {
      id: newId,
      name: `${detail.name} (copy)`,
      movement: detail.movement,
      variant: detail.variant,
      display_alias: detail.display_alias,
      equipment: detail.equipment,
      mechanic: detail.mechanic,
      category: detail.category,
      default_increment_kg: detail.default_increment_kg,
      source: 'custom',
      muscles: detail.muscles.map((m) => ({ muscle_id: m.muscle_id, role: m.role, weight: m.weight })),
    })
    setOpenId(null)
    navigate(`/exercises/${newId}/edit`)
  }

  return (
    <>
      <PageHeader title="Exercises" subtitle="Library" />

      <Input placeholder="Search exercises…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <FilterChips className="mt-2" options={REGION_FILTERS} value={region} onChange={setRegion} />
      <FilterChips className="mt-1" options={MECHANIC_FILTERS} value={mechanic} onChange={setMechanic} />

      {loading && exercises.length === 0 && <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>}

      {!loading && error !== null && (
        <div className="mt-6 text-center text-sm text-status-crit">
          <p>Could not load the library: {error}</p>
          <button
            type="button"
            className="mt-2 rounded-lg border border-border px-3 py-1.5 text-[13px] text-foreground"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && error === null && groups.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">No matches</p>
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
              <Card
                key={item.id}
                className="cursor-pointer flex-row items-center justify-between gap-2 px-3 py-2.5"
                onClick={() => setOpenId(item.id)}
              >
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-bold">{item.display_name}</div>
                  <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{cardSubtitle(item)}</div>
                </div>
                <span className="shrink-0 text-muted-foreground">›</span>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <ExerciseDetailSheet
        exerciseId={openId}
        open={openId !== null}
        onOpenChange={(open) => !open && setOpenId(null)}
        onDuplicated={handleDuplicated}
      />
    </>
  )
}
