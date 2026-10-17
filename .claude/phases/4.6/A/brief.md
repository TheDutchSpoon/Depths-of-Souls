# 4.6-A — Engine hardening

Phase brief: `.claude/phases/4.6/brief.md`. Golden policy: **byte-identical**, with two listed
exceptions: `golden-round-end-interaction` gains one `TriggerFired`
(`phases/4.6/brief.md#the-load-time-checks-close-their-gaps`), and three goldens move a non-fresh
creature's state into their `setup` step with expected values unchanged
(`phases/4.6/brief.md#fight-setup-checks-its-input`). Any other new guard that makes an
existing test or golden throw is a stop-and-ask (`phases/4.6/brief.md#sequencing-rules`).

Reads: `spec/combat.md`, `spec/effects.md`, `spec/responses.md`, `spec/statuses.md`;
`CONVENTIONS.md#snapshots-are-never-written-to` and
`CONVENTIONS.md#combatstate-is-plain-data-never-modified-after-being-returned`.

## Scope

- `phases/4.6/brief.md#fight-setup-checks-its-input`.
- `phases/4.6/brief.md#the-load-time-checks-close-their-gaps`.
- `phases/4.6/brief.md#no-living-creature-at-0-hp`.
- `phases/4.6/brief.md#a-zero-count-is-a-no-op-for-every-response`.
- `phases/4.6/brief.md#small-engine-fixes`.
- `phases/4.6/brief.md#the-snapshot-lock-covers-maps-and-sets`.

## Known

- Seven `**Known bug:**` lines this slice's PR review removes: `spec/combat.md#fight-setup`,
  `spec/combat.md#aoe-cast`, `spec/combat.md#resolution--timing`, `spec/effects.md#validators`,
  `spec/effects.md#damage-observation`, `spec/statuses.md#turn-order` and
  `spec/responses.md#fizzles`.
- The engine code cited in the entries is unchanged since the review (`src/engine` has no diff
  between `8aef772` and `31ea263`), so its line numbers hold.
- Split line if the plan is too big: A1 (setup and load-time checks), A2 (runtime fixes).

## Done when

Every new guard and fix has a test that fails with it removed, at every site it is built
(`CONVENTIONS.md#a-mechanism-at-more-than-one-site-is-tested-at-each-site`), every golden's expected
values but the listed `TriggerFired` and the corpus digest are byte-identical, and the deep-freeze helper throws on a `Map` or `Set` write.
