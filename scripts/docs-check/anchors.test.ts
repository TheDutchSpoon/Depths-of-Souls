import { describe, expect, it } from 'vitest'
import { resolveAnchors } from './anchors.ts'

const anchors = (...headings: string[]) => [...resolveAnchors(headings)]

describe('resolveAnchors', () => {
  it('slugs a heading the way GitHub does', () => {
    expect(anchors('## Damage channels and the Additional')).toEqual([
      'damage-channels-and-the-additional',
    ])
    expect(anchors('### `materializeCreature` & **friends**: (a/b)')).toEqual([
      'materializecreature--friends-ab',
    ])
  })

  // The slug collision (4.2-G trap 1): a repeat gets the first free `-<n>`, so a real heading
  // named like a suffixed slug does not collide with it.
  it('gives a, a, a-1 the anchors a, a-1, a-1-1', () => {
    expect(anchors('## a', '## a', '## a-1')).toEqual(['a', 'a-1', 'a-1-1'])
  })

  it('gives a-1, a, a the anchors a-1, a, a-2', () => {
    expect(anchors('## a-1', '## a', '## a')).toEqual(['a-1', 'a', 'a-2'])
  })

  it('numbers three repeats a, a-1, a-2', () => {
    expect(anchors('## a', '## a', '## a')).toEqual(['a', 'a-1', 'a-2'])
  })

  it('skips fenced lines and non-headings', () => {
    expect(
      anchors('## real', '```', '## inside a fence', '```', 'not a heading'),
    ).toEqual(['real'])
  })
})
