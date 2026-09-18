import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { WorkoutListItem } from '@/types'
import type { WorkoutSection } from '@/lib/workoutGrouping'

const UNGROUPED_SECTION_KEY = '__ungrouped__'

function workoutSectionKey(section: WorkoutSection): string {
  return section.id ?? UNGROUPED_SECTION_KEY
}

interface WorkoutGroupListProps {
  sections: WorkoutSection[]
  // Whether any named group exists at all -- with none, the single
  // "All workouts" pile needs no header, it already is the whole list.
  hasNamedGroups: boolean
  collapsed: Set<string>
  onToggle: (key: string) => void
  renderWorkout: (workout: WorkoutListItem) => ReactNode
}

// Section header (chevron + name + count) and its collapsible body, shared
// by the Workouts page and the dashboard's workout picker (BACKLOG #51) so a
// group looks and behaves the same wherever a workout is chosen from. Each
// caller owns the row itself via `renderWorkout` -- the Workouts page keeps
// its Badge + "Start" button and navigates on tap, the dashboard picker just
// selects the workout for analysis.
export function WorkoutGroupList({ sections, hasNamedGroups, collapsed, onToggle, renderWorkout }: WorkoutGroupListProps) {
  return (
    <div className="flex flex-col gap-3">
      {sections.map((section) => {
        const key = workoutSectionKey(section)
        // A single unnamed pile needs no header -- that is just the list.
        if (section.id === null && !hasNamedGroups) {
          return (
            <div key={key} className="flex flex-col gap-2">
              {section.workouts.map(renderWorkout)}
            </div>
          )
        }
        const isOpen = !collapsed.has(key)
        return (
          <div key={key}>
            <button
              type="button"
              className="flex w-full items-center gap-1.5 py-1.5 text-left"
              onClick={() => onToggle(key)}
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{section.name}</span>
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] tabular-nums text-muted-foreground">{section.workouts.length}</span>
            </button>

            {isOpen && (
              <div className="flex flex-col gap-2">
                {section.workouts.length === 0 ? (
                  <p className="px-1 py-1 text-[12px] text-muted-foreground">No workouts in this group yet.</p>
                ) : (
                  section.workouts.map(renderWorkout)
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
