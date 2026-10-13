import type { ReactNode } from 'react'
import { InfoButton } from '@/components/InfoButton'

interface TileHeaderProps {
  // What the tile shows -- fixed, never changes with the range.
  title: string
  // The explanation, and whatever follows the selected range.
  subline?: ReactNode
  infoTerm?: string
  // Right end of the title row, e.g. a tag.
  aside?: ReactNode
  className?: string
}

// Title + subline of a dashboard tile (BACKLOG #131). The old tile headings
// were measure names in small caps ("ACWR/session") -- they read as sublines
// and left the tile without a name.
export function TileHeader({ title, subline, infoTerm, aside, className }: TileHeaderProps) {
  return (
    <div className={className ?? 'mb-2'}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[14px] font-bold leading-tight">
          {title}
          {infoTerm && <InfoButton term={infoTerm} />}
        </div>
        {aside}
      </div>
      {subline && <div className="mt-0.5 text-[11px] text-muted-foreground">{subline}</div>}
    </div>
  )
}
