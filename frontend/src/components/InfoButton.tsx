import { Info } from 'lucide-react'
import { useGlossaryStore } from '@/store/useGlossaryStore'

interface InfoButtonProps {
  term?: string
  label?: string
}

// Small ⓘ button that opens the shared GlossarySheet, optionally scrolled
// and highlighted to one term (matches the prototype's header ⓘ and
// inline glossTerm() buttons).
export function InfoButton({ term, label }: InfoButtonProps) {
  const open = useGlossaryStore((s) => s.open)
  return (
    <button
      type="button"
      onClick={() => open(term)}
      className="inline-flex size-[16px] shrink-0 items-center justify-center text-muted-foreground"
      aria-label={label ?? (term ? `Explain ${term}` : 'Glossary')}
    >
      <Info className="size-[14px]" />
    </button>
  )
}
