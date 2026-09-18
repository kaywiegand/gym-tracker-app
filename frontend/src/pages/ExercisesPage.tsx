import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Exercise } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { ExerciseSelector } from '@/components/ExerciseSelector'
import { ExerciseDetailSheet } from '@/components/ExerciseDetailSheet'

export function ExercisesPage() {
  const [openId, setOpenId] = useState<string | null>(null)
  const navigate = useNavigate()

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

      <ExerciseSelector onSelect={(item) => setOpenId(item.id)} />

      <ExerciseDetailSheet
        exerciseId={openId}
        open={openId !== null}
        onOpenChange={(open) => !open && setOpenId(null)}
        onDuplicated={handleDuplicated}
      />
    </>
  )
}
