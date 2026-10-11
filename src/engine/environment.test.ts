import { describe, expect, it } from 'vitest'

// A guard proving the Vitest project split actually enforces
// engine purity, not just documents it -- `CONVENTIONS.md#test-environments` (src/engine runs in Node, which also
// enforces engine purity: DOM globals are undefined there). If this file were ever collected by
// the jsdom project instead (a config regression), both assertions below would fail.

describe('src/engine runs in Node, not jsdom', () => {
  it('has no DOM globals', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
  })
})
