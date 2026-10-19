// Throwaway demo: replaced by the real combat UI (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).
import { useLayoutEffect, useRef } from 'react'
import { FOLLOW_TOLERANCE_PX, isAtBottom, shouldResetFollow } from '../app/followLog'
import { useFillViewport } from './useFillViewport'

// The fight's log in its own scrolling box. Following is this box's own state, a ref outside the
// playback state and the timer key: scrolling never dispatches and never restarts a beat.

export function LogBox({
  text,
  fight,
  revealed,
}: {
  text: string
  fight: number
  revealed: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const following = useRef(true)
  const previous = useRef({ fight, revealed })
  useFillViewport(box)

  // Runs after the log grew. `following` holds the answer read at the last scroll event, so it is
  // the reader's position before this beat, not the grown box's.
  useLayoutEffect(() => {
    const element = box.current!
    if (shouldResetFollow(previous.current, { fight, revealed })) following.current = true
    previous.current = { fight, revealed }
    // The scroll this causes fires a scroll event that reads as the bottom, so following stays on.
    if (following.current) element.scrollTop = element.scrollHeight
  }, [text, fight, revealed])

  return (
    <div
      ref={box}
      className="log-box"
      role="log"
      tabIndex={0}
      onScroll={(event) => {
        following.current = isAtBottom(event.currentTarget, FOLLOW_TOLERANCE_PX)
      }}
    >
      {text}
    </div>
  )
}
