import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Exercise, ExerciseNamingVocabulary } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { SegmentedControl } from '@/components/SegmentedControl'
import { NumberField } from '@/components/NumberField'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Mechanic = 'compound' | 'isolation'

// Curating an exercise = giving it a movement (and optionally a variant).
// The muscle and the equipment already exist in the data, so the structured
// name is assembled from all four -- never typed. That is what keeps two
// spellings of the same exercise from existing side by side.
//
// Only the scalar fields are editable here -- the duplicated copy's muscle
// assignments carry over as-is (see plan §4). A full primary/secondary
// muscle re-assignment editor is out of scope for Stage 1.
export function ExerciseEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [name, setName] = useState('')
  const [movement, setMovement] = useState('')
  const [variant, setVariant] = useState('')
  const [alias, setAlias] = useState('')
  const [vocabulary, setVocabulary] = useState<ExerciseNamingVocabulary>({ movements: [], variants: [] })
  const [equipment, setEquipment] = useState('')
  const [category, setCategory] = useState('')
  const [mechanic, setMechanic] = useState<Mechanic>('compound')
  const [increment, setIncrement] = useState(2.5)
  const [saving, setSaving] = useState(false)
  // Same failure mode as the workout editor: without this a rejected save
  // just reset the button and looked like it had gone through.
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api.get<Exercise>(`/exercises/${id}`).then((ex) => {
      setExercise(ex)
      setName(ex.name)
      setMovement(ex.movement ?? '')
      setVariant(ex.variant ?? '')
      setAlias(ex.display_alias ?? '')
      setEquipment(ex.equipment ?? '')
      setCategory(ex.category ?? '')
      setMechanic(ex.mechanic === 'isolation' ? 'isolation' : 'compound')
      setIncrement(ex.default_increment_kg ?? 2.5)
    })
  }, [id])

  useEffect(() => {
    api.get<ExerciseNamingVocabulary>('/exercises/naming-vocabulary').then(setVocabulary)
  }, [])

  // Mirrors ExerciseNaming::displayName() on the server so the preview below
  // updates while typing. The server stays the authority -- this only shows
  // what the saved name will be.
  const previewName =
    movement.trim() === ''
      ? name
      : previewTitle(exercise?.primary_muscle ?? '', movement.trim(), equipment, variant.trim())

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    try {
      await api.put(`/exercises/${id}`, {
        name,
        movement: movement.trim() || null,
        variant: variant.trim() || null,
        display_alias: alias.trim() || null,
        equipment: equipment || null,
        category: category || null,
        mechanic,
        default_increment_kg: increment,
      })
      setSaveError(null)
      navigate('/exercises')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Request failed')
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
      <PageHeader
        title="Edit exercise"
        subtitle={exercise.source === 'custom' ? 'Your copy' : `Library entry · ${exercise.name}`}
        showThemeToggle={false}
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ex-name">Name</Label>
          <Input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <Card>
          <CardContent className="flex flex-col gap-3 py-1">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Naming</div>

            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="ex-movement">Movement</Label>
                <Input
                  id="ex-movement"
                  list="movement-options"
                  placeholder="Press, Row, Curl…"
                  value={movement}
                  onChange={(e) => setMovement(e.target.value)}
                />
                <datalist id="movement-options">
                  {vocabulary.movements.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="ex-variant">Variant</Label>
                <Input
                  id="ex-variant"
                  list="variant-options"
                  placeholder="Incline, Seated…"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                />
                <datalist id="variant-options">
                  {vocabulary.variants.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ex-alias">Common name</Label>
              <Input
                id="ex-alias"
                placeholder={name}
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Shows up as</div>
              <div className="mt-0.5 text-[14px] font-bold">{previewName}</div>
              <div className="text-[11px] text-muted-foreground">{alias.trim() || name}</div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              {movement.trim() === ''
                ? 'Without a movement this exercise keeps its source name and stays out of My library.'
                : 'Muscle and equipment come from the data below — only movement and variant are typed.'}
            </p>
          </CardContent>
        </Card>

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

        {saveError !== null && (
          <p className="text-center text-[12.5px] text-status-crit">
            Not saved: {saveError}. Your changes are still on this screen -- try again.
          </p>
        )}

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

// Mirror of ExerciseNaming::muscleLabel() plus its leg-machine rule
// (api/lib/ExerciseNaming.php): the gym calls these Leg Curl / Leg Extension /
// Leg Press, never "Hamstrings Curl". Without this the preview promises a
// different title than the one the server computes on save.
const MUSCLE_LABELS: Record<string, string> = {
  abdominals: 'Abs',
  quadriceps: 'Quads',
  'middle back': 'Mid Back',
}
const LEG_TITLE_MUSCLES = ['quadriceps', 'hamstrings']
const LEG_TITLE_MOVEMENTS = ['Curl', 'Extension', 'Press']

function muscleLabel(muscle: string, movement: string): string {
  const key = muscle.trim().toLowerCase()
  if (key === '') return ''
  if (LEG_TITLE_MUSCLES.includes(key) && LEG_TITLE_MOVEMENTS.includes(movement)) return 'Legs'
  return MUSCLE_LABELS[key] ?? muscle
}

const MUSCLE_FREE_MOVEMENTS = ['Squat', 'Deadlift']

function joinSingleLeg(words: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < words.length; i++) {
    if (words[i].toLowerCase() === 'single' && words[i + 1]?.toLowerCase() === 'leg') {
      out.push('Single-Leg')
      i++
    } else {
      out.push(words[i])
    }
  }
  return out
}

// Mirror of ExerciseNaming::displayName() for a curated exercise -- the only
// case the editor previews, so no movement/variant inference here. Same rules
// in the same order: muscle-free Squat/Deadlift, Smith into the equipment
// slot, Single-Leg as one word, no stray "Leg" in a Legs title, no variant
// that only repeats another part.
function previewTitle(primaryMuscle: string, movement: string, equipment: string, variant: string): string {
  const muscle = MUSCLE_FREE_MOVEMENTS.includes(movement) ? '' : muscleLabel(primaryMuscle, movement)
  let equipmentText = equipmentLabel(equipment)
  let words = variant.split(/\s+/).filter((w) => w !== '')
  const withoutSmith = words.filter((w) => w.toLowerCase() !== 'smith')
  if (withoutSmith.length !== words.length) {
    equipmentText = 'Smith-Machine'
    words = withoutSmith
  }
  words = joinSingleLeg(words)
  if (muscle === 'Legs') words = words.filter((w) => w.toLowerCase() !== 'leg')
  let variantText = words.join(' ')
  if (variantText.toLowerCase() === equipmentText.toLowerCase() || variantText.toLowerCase() === muscle.toLowerCase()) {
    variantText = ''
  }
  return [muscle, movement, equipmentText, variantText].filter((p) => p !== '').join(' ')
}

// Mirror of ExerciseNaming::EQUIPMENT_LABELS (api/lib/ExerciseNaming.php) --
// only used for the live preview; the saved name is built server-side.
const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  machine: 'Machine',
  'body only': 'Bodyweight',
  kettlebells: 'Kettlebell',
  bands: 'Band',
  'e-z curl bar': 'EZ-Bar',
  'medicine ball': 'Medicine Ball',
  'exercise ball': 'Ball',
  'foam roll': 'Foam Roller',
  other: '',
}

function equipmentLabel(equipment: string): string {
  const key = equipment.trim().toLowerCase()
  if (key === '') return ''
  return EQUIPMENT_LABELS[key] ?? key.replace(/\b\w/g, (c) => c.toUpperCase())
}
