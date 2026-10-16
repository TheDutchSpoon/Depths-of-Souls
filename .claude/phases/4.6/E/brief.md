# 4.6-E — Content

Phase brief: `.claude/phases/4.6/brief.md`. Golden policy: **deliberate content change**; the id
renames in a commit of their own, whose golden and corpus changes are only the renamed strings.
CI balance verdicts re-checked (`phases/4.6/brief.md#balance-verdicts`).

Reads: `content/overgrowth.md`, `content/glimmerdark.md`, `content/rotcap-hollow.md`,
`content/enemy-behaviour.md`; `spec/effects.md#death-reset` and `spec/effects.md#trigger-conditions`.

## Scope

- `phases/4.6/brief.md#the-cinderlord-needs-a-burning-victim`.
- `phases/4.6/brief.md#two-payoffs-become-strikers`.
- `phases/4.6/brief.md#three-renames`.

## Known

- No `**Known bug:**` lines: each item is a new direction. The PR review rewrites the entries.
- Each changed entry's `description` in `src/data` changes in the same commit as its data.
- The engine already reads a dead creature's statuses in a condition (`hasStatus` doesn't check
  `alive`); the Cinderlord's condition is data, and the rule is the spec's.

## Done when

The Cinderlord burns every enemy only after killing a Burning creature (a hand-derived golden on
real data shows both cases), the two payoffs run `striker`, the three names and ids are renamed
everywhere, the rename commit's fixture diff holds only those strings, and every changed corpus row
is attributed to one item.
