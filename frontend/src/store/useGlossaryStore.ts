import { create } from 'zustand'

interface GlossaryState {
  isOpen: boolean
  openTerm: string | null
  open: (term?: string) => void
  close: () => void
}

// A single mounted GlossarySheet (in DashboardPage) is driven by this store
// so InfoButtons anywhere in the scope-component tree can open it without
// prop-drilling the sheet's open state through every parent.
export const useGlossaryStore = create<GlossaryState>((set) => ({
  isOpen: false,
  openTerm: null,
  open: (term) => set({ isOpen: true, openTerm: term ?? null }),
  close: () => set({ isOpen: false }),
}))
