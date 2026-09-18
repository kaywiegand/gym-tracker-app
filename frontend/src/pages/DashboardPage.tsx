import { useState, type CSSProperties } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { FilterChips } from '@/components/FilterChips'
import { InfoButton } from '@/components/InfoButton'
import { GlossarySheet } from '@/components/GlossarySheet'
import { useStickyOffset } from '@/lib/useStickyOffset'
import { OverviewScope } from '@/components/dashboard/OverviewScope'
import { ExerciseScope } from '@/components/dashboard/ExerciseScope'
import { WorkoutScope } from '@/components/dashboard/WorkoutScope'
import { BodyScope } from '@/components/dashboard/BodyScope'

const SCOPES = ['Overview', 'Exercise', 'Workout', 'Body'] as const
type Scope = (typeof SCOPES)[number]

export function DashboardPage() {
  const [scope, setScope] = useState<Scope>('Overview')
  // Title + scope tabs are one sticky block (inside PageHeader). Each scope
  // publishes its own second sticky block -- range switch, and on
  // Workout/Exercise the selected item's header -- flush beneath it via
  // this measured height, passed down as a CSS variable (BACKLOG #50).
  const { ref: headerRef, offset: headerOffset } = useStickyOffset<HTMLElement>()

  return (
    <div style={{ '--dashboard-sticky-top': `${headerOffset}px` } as CSSProperties}>
      <PageHeader ref={headerRef} title="Dashboard" subtitle="Your progress" action={<InfoButton label="Glossary" />}>
        <FilterChips options={[...SCOPES]} value={scope} onChange={(v) => setScope(v as Scope)} />
      </PageHeader>

      {scope === 'Overview' && <OverviewScope />}
      {scope === 'Exercise' && <ExerciseScope />}
      {scope === 'Workout' && <WorkoutScope />}
      {scope === 'Body' && <BodyScope />}

      <GlossarySheet />
    </div>
  )
}
