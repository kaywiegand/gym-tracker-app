import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { FilterChips } from '@/components/FilterChips'
import { OverviewScope } from '@/components/dashboard/OverviewScope'
import { ExerciseScope } from '@/components/dashboard/ExerciseScope'
import { WorkoutScope } from '@/components/dashboard/WorkoutScope'

const SCOPES = ['Overview', 'Exercise', 'Workout'] as const
type Scope = (typeof SCOPES)[number]

// Body scope (BIA-derived composition KPIs) joins this segmented control in
// Stage 5, once there's BIA data to show -- CLAUDE.md §10.
export function DashboardPage() {
  const [scope, setScope] = useState<Scope>('Overview')

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your progress" />
      <FilterChips className="mb-3" options={[...SCOPES]} value={scope} onChange={(v) => setScope(v as Scope)} />

      {scope === 'Overview' && <OverviewScope />}
      {scope === 'Exercise' && <ExerciseScope />}
      {scope === 'Workout' && <WorkoutScope />}
    </>
  )
}
