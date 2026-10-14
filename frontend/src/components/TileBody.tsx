import type { ReactNode } from 'react'

interface TileBodyProps {
  // Fixed height of the body area in px -- set by the tile's own regular
  // content, never by the selected range or by what data came back.
  height: number
  // Message for the empty/loading state. When set it replaces `children`
  // inside the same box, centred, so the tile never changes height
  // (BACKLOG #141).
  message?: ReactNode
  className?: string
  children?: ReactNode
}

// The body of a dashboard tile with a fixed height. The scroll anchor
// (lib/useScrollAnchor.ts) can only keep the page still while the tiles keep
// their size; a tile that shrinks to a one-line "no data" text on one range
// and grows back on the next moves everything below it.
export function TileBody({ height, message, className, children }: TileBodyProps) {
  return (
    <div className={className} style={{ height }}>
      {message !== undefined ? (
        <div className="flex h-full items-center justify-center px-4 text-center text-[12px] text-muted-foreground">{message}</div>
      ) : (
        children
      )}
    </div>
  )
}
