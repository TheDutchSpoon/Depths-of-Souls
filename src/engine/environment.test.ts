import { describe, expect, it } from 'vitest'

// Phase 4.1-A (S4); review fix F2: a guard proving the Vitest project split actually enforces
// engine purity, not just documents it -- CONVENTIONS "src/engine... run in Node (which also
// enforces engine purity: DOM globals are undefined there)". If this file were ever collected by
// the jsdom project instead (a config regression), both assertions below would fail.

describe('src/engine runs in Node, not jsdom', () => {
  it('has no DOM globals', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
  })
})
