import { useEffect, useRef, useState } from 'react'

// Measures an element's rendered box height, including its own bottom
// margin -- the exact distance a sibling further down the page needs as its
// `top` to sit flush beneath it once both are stuck (BACKLOG #50: stacking
// two independent `position: sticky` regions without a hardcoded pixel
// offset that would drift if the header's content, font size or padding
// ever changes). Re-measures on resize so it stays correct across devices
// and text wrapping.
export function useStickyOffset<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const marginBottom = parseFloat(getComputedStyle(el).marginBottom || '0')
      setOffset(el.getBoundingClientRect().height + marginBottom)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, offset }
}
