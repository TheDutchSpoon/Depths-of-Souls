import { useEffect, useLayoutEffect } from 'react'
import type { RefObject } from 'react'

/** The gap kept between the bottom of the box and the bottom of the viewport. */
const FILL_MARGIN_PX = 8

/** The fewest lines of log the box shows, whatever the viewport. */
const MIN_LINES = 10

/** Sizes the element to the space from its top to the bottom of the viewport, never under ten
 * lines. The ten lines are the element's own `--log-line-height` ratio times ten `em`: the `lh`
 * unit resolves a ten-line height shorter than the lines it holds once the box has text.
 * The top is measured from the top of the document, so a scrolled page gives the same
 * height. The height is set on the element and not held in React state: it depends only on what
 * is above the element, so setting it changes nothing that the next measurement reads.
 *
 * It is re-measured on every render of the owner (a refusal or preview line above the viewer
 * appears and goes with the screen's state, and re-renders the viewer) and on a window resize. */
export function useFillViewport(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => fit(ref.current))
  useEffect(() => {
    const onResize = () => fit(ref.current)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [ref])
}

function fit(element: HTMLElement | null): void {
  if (element === null) return
  const top = element.getBoundingClientRect().top + window.scrollY
  element.style.height = `max(calc(${MIN_LINES} * var(--log-line-height) * 1em), calc(100dvh - ${top}px - ${FILL_MARGIN_PX}px))`
}
