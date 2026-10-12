import { useEffect, useLayoutEffect, useRef } from 'react'

// Keeps the card at the top of the viewport where it is when the content
// above it changes height -- e.g. the consistency calendar growing from 8 to
// 52 weeks on a range change (BACKLOG #117). Browsers with native scroll
// anchoring do this themselves; iOS Safari does not, so the chart being
// compared jumped away on every range switch.
//
// Attach the returned ref to the element whose direct children are the
// cards. The anchor is remembered while scrolling and on every tap (the
// range chips sit outside the scroller) and restored after every render,
// before the browser paints. An anchor taken at another scroll position is
// ignored, so a missed scroll event can never move the page.
export function useScrollAnchor<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const anchor = useRef<{ index: number; offset: number; scrollTop: number } | null>(null)

  useLayoutEffect(() => {
    const root = ref.current
    const scroller = root?.closest('main')
    const a = anchor.current
    if (!root || !scroller || !a || Math.abs(scroller.scrollTop - a.scrollTop) > 1) return
    const card = root.children[a.index]
    if (!card) return
    const delta = card.getBoundingClientRect().top - scroller.getBoundingClientRect().top - a.offset
    if (Math.abs(delta) > 0.5) {
      scroller.scrollTop += delta
      anchor.current = { ...a, scrollTop: scroller.scrollTop }
    }
  })

  useEffect(() => {
    const root = ref.current
    const scroller = root?.closest('main')
    if (!root || !scroller) return
    const record = () => {
      const top = scroller.getBoundingClientRect().top
      const cards = Array.from(root.children)
      const index = cards.findIndex((c) => c.getBoundingClientRect().bottom > top)
      anchor.current = index < 0 ? null : { index, offset: cards[index].getBoundingClientRect().top - top, scrollTop: scroller.scrollTop }
    }
    record()
    scroller.addEventListener('scroll', record, { passive: true })
    document.addEventListener('click', record, true)
    return () => {
      scroller.removeEventListener('scroll', record)
      document.removeEventListener('click', record, true)
    }
  })

  return ref
}
