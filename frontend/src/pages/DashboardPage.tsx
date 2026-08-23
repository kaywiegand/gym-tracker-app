import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { FilterChips } from '@/components/FilterChips'
import { InfoButton } from '@/components/InfoButton'
import { GlossarySheet } from '@/components/GlossarySheet'
import { OverviewScope } from '@/components/dashboard/OverviewScope'
import { ExerciseScope } from '@/components/dashboard/ExerciseScope'
import { WorkoutScope } from '@/components/dashboard/WorkoutScope'
import { BodyScope } from '@/components/dashboard/BodyScope'

const SCOPES = ['Overview', 'Exercise', 'Workout', 'Body'] as const
type Scope = (typeof SCOPES)[number]

export function DashboardPage() {
  const [scope, setScope] = useState<Scope>('Overview')

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your progress" action={<InfoButton label="Glossary" />} />
      <FilterChips className="mb-3" options={[...SCOPES]} value={scope} onChange={(v) => setScope(v as Scope)} />

      {scope === 'Overview' && <OverviewScope />}
      {scope === 'Exercise' && <ExerciseScope />}
      {scope === 'Workout' && <WorkoutScope />}
      {scope === 'Body' && <BodyScope />}

      <GlossarySheet />
    </>
  )
}
