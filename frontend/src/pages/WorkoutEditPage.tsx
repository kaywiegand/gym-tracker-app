import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import type { ExerciseListItem, TrainingMode, Workout } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { SegmentedControl } from '@/components/SegmentedControl'
import { NumberField } from '@/components/NumberField'
import { ExercisePickerSheet } from '@/components/ExercisePickerSheet'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, ChevronUp, ChevronDown } from 'lucide-react'

interface DraftExercise {
  tempId: string
  exercise_id: string
  exercise_name: string
  planned_sets: number
}

export function WorkoutEditPage() {
  const { id } = useParams<{ id: string }>()
  const isEditing = id !== undefined
  const navigate = useNavigate()

  const [modes, setModes] = useState<TrainingMode[]>([])
  const [name, setName] = useState('')
  const [modeId, setModeId] = useState<number | null>(null)
  const [exercises, setExercises] = useState<DraftExercise[]>([])
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    api.get<TrainingMode[]>('/training-modes').then((m) => {
      setModes(m)
      setModeId((current) => current ?? m[0]?.id ?? null)
    })
  }, [])

  useEffect(() => {
    if (!id) return
    api.get<Workout>(`/workouts/${id}`).then((w) => {
      setName(w.name)
      setModeId(w.mode_id)
      setExercises(
        w.exercises.map((e) => ({
          tempId: e.id,
          exercise_id: e.exercise_id,
          exercise_name: e.exercise_name,
          planned_sets: e.planned_sets,
        })),
      )
      setLoading(false)
    })
  }, [id])

  function addExercise(ex: ExerciseListItem) {
    setExercises((prev) => [...prev, { tempId: crypto.randomUUID(), exercise_id: ex.id, exercise_name: ex.name, planned_sets: 3 }])
    setPickerOpen(false)
  }

  function removeExercise(tempId: string) {
    setExercises((prev) => prev.filter((e) => e.tempId !== tempId))
  }

  function updatePlannedSets(tempId: string, value: number) {
    setExercises((prev) => prev.map((e) => (e.tempId === tempId ? { ...e, planned_sets: value } : e)))
  }

  function move(tempId: string, direction: -1 | 1) {
    setExercises((prev) => {
      const index = prev.findIndex((e) => e.tempId === tempId)
      const target = index + direction
      if (index === -1 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleSave() {
    if (!name.trim() || modeId === null) return
    setSaving(true)
    const payload = {
      name: name.trim(),
      mode_id: modeId,
      exercises: exercises.map((e) => ({ exercise_id: e.exercise_id, planned_sets: e.planned_sets })),
    }
    try {
      if (isEditing) {
        await api.put(`/workouts/${id}`, payload)
      } else {
        await api.post('/workouts', { id: crypto.randomUUID(), ...payload })
      }
      navigate('/workouts')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    if (!window.confirm('Delete this workout?')) return
    await api.delete(`/workouts/${id}`)
    navigate('/workouts')
  }

  if (loading) {
    return (
      <>
        <PageHeader title={isEditing ? 'Edit workout' : 'New workout'} subtitle="Template" showThemeToggle={false} />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </>
    )
  }

  const selectedMode = modes.find((m) => m.id === modeId)

  return (
    <>
      <PageHeader title={isEditing ? 'Edit workout' : 'New workout'} subtitle="Template" showThemeToggle={false} />

      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Name</div>
      <Input placeholder="e.g. Push" value={name} onChange={(e) => setName(e.target.value)} />

      <div className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Training mode</div>
      <SegmentedControl
        value={modeId !== null ? String(modeId) : ''}
        onChange={(v) => setModeId(Number(v))}
        options={modes.map((m) => ({ value: String(m.id), label: `${m.name} ${m.rep_low}–${m.rep_high}` }))}
      />
      <p className="mt-1.5 px-0.5 text-[11px] text-muted-foreground">All exercises inherit this mode's rep range.</p>

      <div className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Exercises</div>
      <div className="flex flex-col gap-1.5">
        {exercises.length === 0 && <p className="text-sm text-muted-foreground">No exercises yet.</p>}
        {exercises.map((ex, i) => (
          <Card key={ex.tempId} className="px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-bold">{ex.exercise_name}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {selectedMode ? `${selectedMode.rep_low}–${selectedMode.rep_high} reps` : ''} · no fixed target weight
                </div>
              </div>
              <NumberField width="3.5rem" value={ex.planned_sets} onChange={(v) => updatePlannedSets(ex.tempId, v)} aria-label={`${ex.exercise_name} planned sets`} />
              <div className="flex flex-col">
                <button type="button" disabled={i === 0} className="text-muted-foreground disabled:opacity-30" onClick={() => move(ex.tempId, -1)} aria-label="Move up">
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={i === exercises.length - 1}
                  className="text-muted-foreground disabled:opacity-30"
                  onClick={() => move(ex.tempId, 1)}
                  aria-label="Move down"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
              <button type="button" className="text-muted-foreground" onClick={() => removeExercise(ex.tempId)} aria-label={`Remove ${ex.exercise_name}`}>
                <X className="size-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Button type="button" variant="outline" className="mt-2 w-full border-dashed" onClick={() => setPickerOpen(true)}>
        + Add exercise
      </Button>

      <div className="mt-5 flex flex-col gap-2">
        <Button type="button" disabled={saving || !name.trim() || modeId === null} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save workout'}
        </Button>
        {isEditing && (
          <Button type="button" variant="outline" onClick={handleDelete}>
            Delete workout
          </Button>
        )}
      </div>

      <ExercisePickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={addExercise}
        excludeIds={exercises.map((e) => e.exercise_id)}
      />
    </>
  )
}
