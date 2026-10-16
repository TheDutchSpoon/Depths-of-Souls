# 4.6-B — Game layer and the comment sweep

Phase brief: `.claude/phases/4.6/brief.md`. Golden policy: goldens and the corpus digest
**byte-identical**; store, demo and simulator tests change only where
`phases/4.6/brief.md#bs-listed-test-changes` lists. The comment sweep is the last commit, proven
comment-only.

Reads: `spec/store.md`, `spec/run.md`, `spec/progression.md`; `CONVENTIONS.md#comment-why-not-what`,
`CONVENTIONS.md#no-magic-numbers` and `CONVENTIONS.md#where-each-number-lives`;
`phases/4.5/brief.md#trait-and-perk-text`.

## Scope

- `phases/4.6/brief.md#the-cave-has-no-content-frontier`.
- `phases/4.6/brief.md#the-intros-unicorn-rolls-its-spells`.
- `phases/4.6/brief.md#recordbosskill-refuses-an-unknown-boss`.
- `phases/4.6/brief.md#numbers-out-of-the-logic`.
- `phases/4.6/brief.md#small-game-layer-fixes`.
- `phases/4.6/brief.md#descriptions-follow-their-entries`.
- `phases/4.6/brief.md#the-comment-sweep`, last.

## Known

- Three `**Known bug:**` lines this slice's PR review removes:
  `spec/run.md#enemy-script-and-gem-set`, `spec/store.md#how-store-actions-fail` and
  `spec/store.md#store-actions`.
- The re-verified locations (after 4.5-G2 and G3): `store.ts:793` (`recordBossKill`),
  `store.ts:1027-1032` (the intro Unicorn), `store.ts:405-415` (`unlockBiomeIndex`),
  `balance-sim.ts:297-306`, `:502-503`, `:544-552`, `:858`, `:916`, `:1544`, `:1551`, `:1632`,
  `refusals.ts:16`, `:74`, `playback.ts:43`, `:76`, `DescentViewer.tsx:75`. The comment sweep's
  data-file lines moved with G3's descriptions: `traits/glimmerdark.ts:134-135`,
  `traits/overgrowth.ts:124`, `traits/starters.ts:59`; the rest are as `phases/4.6/review.md`
  lists them.
- The descriptions to transcribe again are the entries the doc sync of 2026-10-16 rewrote: its
  diff on `.claude/content/` and `.claude/specializations/` lists them.

## Done when

A descent to any floor up to one past the deepest cleared plays, floors past the authored biomes
fight the last authored biome, the intro Unicorn holds a full gem set with every later descent
byte-identical, `recordBossKill` refuses an unknown id, no number in the listed logic is a
literal, every rewritten entry's description matches it, and the comment sweep passes
`docs:check -- comment-proof` against the commit before it.
