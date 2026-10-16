# 4.6-D — Rule fixes

Phase brief: `.claude/phases/4.6/brief.md`. Golden policy: **deliberate, listed**: every changed
golden and corpus row is attributed to one fix by switching it off in turn
(`phases/4.6/brief.md#sequencing-rules`). CI balance verdicts re-checked
(`phases/4.6/brief.md#balance-verdicts`).

Reads: `spec/combat.md`, `spec/effects.md`, `spec/responses.md`, `spec/statuses.md`;
`specializations/brute.md`, `specializations/shieldbarer.md`; `content/overgrowth.md`.

## Scope

- `phases/4.6/brief.md#splashing-follows-the-hit`.
- `phases/4.6/brief.md#a-revive-resets-the-defend-count`.
- `phases/4.6/brief.md#a-traits-damage-is-neither-an-attack-nor-a-cast`.
- `phases/4.6/brief.md#granted-defends-are-real-defends`.
- `phases/4.6/brief.md#a-fight-start-health-raise-raises-current-hp`.
- `phases/4.6/brief.md#stun-and-sleep-skip-the-whole-turn`.

## Known

- Six `**Known bug:**` lines this slice's PR review removes: `spec/effects.md#death-reset`,
  `spec/statuses.md#health-is-a-modifiable-stat`, `specializations/brute.md#brute-force`,
  `specializations/shieldbarer.md#shield-up`, `specializations/shieldbarer.md#phalanx` and
  `content/overgrowth.md#snapjaw-lure`. Splashing and Stun and Sleep are new directions, documented
  as `main` builds them: the PR review rewrites those rules.
- Granted Defends build on C's order: the Defend sets the stance and the count, then fires
  `on-defend`.
- Split line if the plan is too big: D1 (Splashing, trait damage, granted Defends), D2 (the Defend
  count, fight-start Health, Stun and Sleep).

## Done when

Each fix has a hand-derived golden or test that fails with it removed, at every site it is built,
including a `damageChannel` retaliator on a splash target, and every changed corpus row and golden
is attributed to one fix.
