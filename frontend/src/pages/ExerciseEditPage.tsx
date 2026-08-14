import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Exercise } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { SegmentedControl } from '@/components/SegmentedControl'
import { NumberField } from '@/components/NumberField'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Mechanic = 'compound' | 'isolation'

// Only the scalar fields are editable here -- the duplicated copy's muscle
// assignments carry over as-is (see plan §4). A full primary/secondary
// muscle re-assignment editor is out of scope for Stage 1.
export function ExerciseEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [name, setName] = useState('')
  const [equipment, setEquipment] = useState('')
  const [category, setCategory] = useState('')
  const [mechanic, setMechanic] = useState<Mechanic>('compound')
  const [increment, setIncrement] = useState(2.5)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get<Exercise>(`/exercises/${id}`).then((ex) => {
      setExercise(ex)
      setName(ex.name)
      setEquipment(ex.equipment ?? '')
      setCategory(ex.category ?? '')
      setMechanic(ex.mechanic === 'isolation' ? 'isolation' : 'compound')
      setIncrement(ex.default_increment_kg ?? 2.5)
    })
  }, [id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    try {
      await api.put(`/exercises/${id}`, {
        name,
        equipment: equipment || null,
        category: category || null,
        mechanic,
        default_increment_kg: increment,
      })
      navigate('/exercises')
    } finally {
      setSaving(false)
    }
  }

  if (!exercise) {
    return (
      <>
        <PageHeader title="Edit exercise" showThemeToggle={false} />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Edit exercise" subtitle="Your copy" showThemeToggle={false} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ex-name">Name</Label>
          <Input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ex-equipment">Equipment</Label>
          <Input id="ex-equipment" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ex-category">Category</Label>
          <Input id="ex-category" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>

        <div>
          <Label className="mb-1.5">Mechanic</Label>
          <SegmentedControl<Mechanic>
            value={mechanic}
            onChange={setMechanic}
            options={[
              { value: 'compound', label: 'Compound' },
              { value: 'isolation', label: 'Isolation' },
            ]}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Increment</Label>
          <NumberField width="5.25rem" step={0.5} unit="kg" value={increment} onChange={setIncrement} />
        </div>

        <Card>
          <CardContent className="py-1">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Muscles (copied, not editable here)</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {exercise.muscles.map((m) => (
                <Badge key={m.muscle_id} variant={m.role === 'primary' ? 'secondary' : 'outline'}>
                  {m.role === 'primary' ? '●' : '○'} {m.name_en}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-2 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/exercises')}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </>
  )
}
