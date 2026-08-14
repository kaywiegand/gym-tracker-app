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

function cardSubtitle(item: ExerciseListItem): string {
  return [item.primary_muscle, item.equipment].filter(Boolean).join(' · ')
}

export function ExercisesPage() {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('All')
  const [mechanic, setMechanic] = useState('All')
  const [exercises, setExercises] = useState<ExerciseListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (region !== 'All') params.set('region', region.toLowerCase())
      if (mechanic !== 'All') params.set('mechanic', mechanic.toLowerCase())
      const qs = params.toString()
      setLoading(true)
      api
        .get<ExerciseListItem[]>(`/exercises${qs ? `?${qs}` : ''}`)
        .then(setExercises)
        .finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(timer)
  }, [query, region, mechanic])

  const groups = groupByRegion(exercises)

  async function handleDuplicated(detail: Exercise) {
    const newId = crypto.randomUUID()
    await api.post('/exercises', {
      id: newId,
      name: `${detail.name} (copy)`,
      movement: detail.movement,
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
      <PageHeader title="Exercises" subtitle="Library · Free Exercise DB" />

      <Input placeholder="Search exercises…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <FilterChips className="mt-2" options={REGION_FILTERS} value={region} onChange={setRegion} />
      <FilterChips className="mt-1" options={MECHANIC_FILTERS} value={mechanic} onChange={setMechanic} />

      {loading && exercises.length === 0 && <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>}

      {!loading && groups.length === 0 && <p className="mt-6 text-center text-sm text-muted-foreground">No matches</p>}

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
                  <div className="truncate text-[13.5px] font-bold">{item.name}</div>
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
