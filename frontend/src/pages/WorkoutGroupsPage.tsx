import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { WorkoutGroup } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

// Groups are display structure, nothing more: deleting one leaves its
// workouts alone, they simply become ungrouped. Said plainly on the button so
// nobody has to guess whether it takes the workouts with it.
export function WorkoutGroupsPage() {
  const [groups, setGroups] = useState<WorkoutGroup[]>([])
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  function load() {
    api.get<WorkoutGroup[]>('/workout-groups').then(setGroups)
  }

  useEffect(load, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await api.post('/workout-groups', { name: trimmed, sort: groups.length })
      setName('')
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(group: WorkoutGroup) {
    await api.delete(`/workout-groups/${group.id}`)
    load()
  }

  async function handleRename(group: WorkoutGroup, next: string) {
    const trimmed = next.trim()
    if (!trimmed || trimmed === group.name) return
    await api.put(`/workout-groups/${group.id}`, { name: trimmed, sort: group.sort })
    load()
  }

  return (
    <>
      <PageHeader title="Workout groups" subtitle="Sections in your workout list" showThemeToggle={false} />

      <form onSubmit={handleAdd} className="mb-3 flex gap-2">
        <Input placeholder="New group, e.g. Warm ups" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" disabled={saving || !name.trim()}>
          Add
        </Button>
      </form>

      {groups.length === 0 ? (
        <Card className="p-4 text-center">
          <p className="text-[12.5px] text-muted-foreground">
            No groups yet. Add one, then pick it when editing a workout.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((g) => (
            <Card key={g.id}>
              <CardContent className="flex items-center gap-2 py-1">
                <Input
                  defaultValue={g.name}
                  className="flex-1"
                  onBlur={(e) => handleRename(g, e.target.value)}
                  aria-label={`Rename ${g.name}`}
                />
                <span className="w-[74px] shrink-0 text-right text-[11px] text-muted-foreground">
                  {g.workout_count} workout{g.workout_count === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground"
                  onClick={() => handleDelete(g)}
                  aria-label={`Delete group ${g.name}`}
                  title="Delete group — its workouts stay, just ungrouped"
                >
                  <Trash2 className="size-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" className="mb-10 mt-4 w-full" onClick={() => navigate('/workouts')}>
        Back to workouts
      </Button>
    </>
  )
}
