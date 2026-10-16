# 4.6-C — When things happen

Phase brief: `.claude/phases/4.6/brief.md`. Golden policy: **deliberate, listed**: every changed
golden and corpus row is attributed to `phases/4.6/brief.md#action-hooks-fire-after-the-action` or
`phases/4.6/brief.md#the-fight-ends-at-the-wipe` by switching each off in turn (`phases/4.6/brief.md#sequencing-rules`). CI balance
verdicts re-checked (`phases/4.6/brief.md#balance-verdicts`).

Reads: `spec/combat.md`, `spec/effects.md`, `spec/responses.md`, `spec/statuses.md`;
`content/overgrowth.md#trigger-words`.

## Scope

- `phases/4.6/brief.md#action-hooks-fire-after-the-action`.
- `phases/4.6/brief.md#the-fight-ends-at-the-wipe`.

## Known

- One `**Known bug:**` line this slice's PR review removes:
  `content/overgrowth.md#lullpollen-sleeper`.
- `spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles` is cited from `src/`: the PR
  removes those citations with the code, and the PR review removes the rule.
- Moving `on-defend` and `on-provoke` after the stance is byte-identical on its own: nothing reads
  the flags or the Defend count in between.
- Split line if the plan is too big: C1 (the wipe), C2 (the action hooks).

## Done when

Each change has hand-derived goldens that fail with it removed (the ones the entries name), every
changed golden and corpus row is attributed to one of the two, and no `on-attack`, `on-cast` or
`on-action-observed` firing precedes its instance's hit or effects anywhere in the corpus.
