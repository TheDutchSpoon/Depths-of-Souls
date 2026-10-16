import { describe, expect, test } from 'vitest'
import { FOLLOW_TOLERANCE_PX, isAtBottom, shouldResetFollow } from './followLog'

// A 200 px box over 1000 px of log: scrollTop 800 is exactly the bottom.
const at = (scrollTop: number) => ({ scrollTop, clientHeight: 200, scrollHeight: 1000 })

describe('isAtBottom', () => {
  test('follows at the bottom', () => {
    expect(isAtBottom(at(800), 0)).toBe(true)
  })

  test('holds when scrolled up', () => {
    expect(isAtBottom(at(0), FOLLOW_TOLERANCE_PX)).toBe(false)
    expect(isAtBottom(at(500), FOLLOW_TOLERANCE_PX)).toBe(false)
  })

  test('the tolerance edge: a gap of exactly the tolerance is at the bottom, one more is not', () => {
    expect(isAtBottom(at(800 - FOLLOW_TOLERANCE_PX), FOLLOW_TOLERANCE_PX)).toBe(true)
    expect(isAtBottom(at(800 - FOLLOW_TOLERANCE_PX - 1), FOLLOW_TOLERANCE_PX)).toBe(false)
  })

  test('without a tolerance a fractional scroll position is not at the bottom', () => {
    expect(isAtBottom(at(799.5), 0)).toBe(false)
    expect(isAtBottom(at(799.5), FOLLOW_TOLERANCE_PX)).toBe(true)
  })

  test('an empty box, or one that fits its content, is at its bottom', () => {
    expect(isAtBottom({ scrollTop: 0, clientHeight: 200, scrollHeight: 0 }, 0)).toBe(true)
    expect(isAtBottom({ scrollTop: 0, clientHeight: 200, scrollHeight: 200 }, 0)).toBe(
      true,
    )
  })

  test('the tolerance is an input, not a constant of the helper', () => {
    expect(isAtBottom(at(790), 10)).toBe(true)
    expect(isAtBottom(at(790), 9)).toBe(false)
  })
})

describe('shouldResetFollow', () => {
  test('a different fight resets', () => {
    expect(shouldResetFollow({ fight: 0, revealed: 5 }, { fight: 1, revealed: 0 })).toBe(
      true,
    )
    expect(shouldResetFollow({ fight: 2, revealed: 0 }, { fight: 1, revealed: 3 })).toBe(
      true,
    )
  })

  test('the same fight with fewer beats shown (a jump to it) resets', () => {
    expect(shouldResetFollow({ fight: 1, revealed: 4 }, { fight: 1, revealed: 0 })).toBe(
      true,
    )
  })

  test('a new beat, or no change, does not reset', () => {
    expect(shouldResetFollow({ fight: 1, revealed: 4 }, { fight: 1, revealed: 5 })).toBe(
      false,
    )
    expect(shouldResetFollow({ fight: 1, revealed: 4 }, { fight: 1, revealed: 4 })).toBe(
      false,
    )
  })
})
