import { useEffect, useRef } from 'react'
import { useGlossaryStore } from '@/store/useGlossaryStore'
import { GLOSSARY } from '@/lib/glossary'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// One instance mounted in DashboardPage, driven by useGlossaryStore so any
// InfoButton in the scope tree can open it (optionally scrolled/highlighted
// to one term) without prop-drilling.
export function GlossarySheet() {
  const isOpen = useGlossaryStore((s) => s.isOpen)
  const openTerm = useGlossaryStore((s) => s.openTerm)
  const close = useGlossaryStore((s) => s.close)
  const entryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (isOpen && openTerm) {
      entryRefs.current[openTerm]?.scrollIntoView({ block: 'start' })
    }
  }, [isOpen, openTerm])

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && close()}>
      <SheetContent side="bottom" className="max-h-[80%] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-[17px]">Glossary</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-4">
          {GLOSSARY.map((entry) => (
            <div
              key={entry.term}
              ref={(el) => {
                entryRefs.current[entry.term] = el
              }}
              className={`rounded-lg p-2 transition-colors ${entry.term === openTerm ? 'bg-secondary' : ''}`}
            >
              <div className="text-[13px] font-bold">{entry.label}</div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">{entry.definition}</div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
