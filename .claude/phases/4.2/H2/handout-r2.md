# Fix hand-out — Phase 4.2 — Slice H2: Code comments, the sweep — Round 2

Branch `4.2-h2` at `4695336`. The proof's base stays `origin/main` at `0126c4a`. This is the same
slice under the same rules as `kickoff.md`:

- every change is a comment;
- golden policy byte-identical;
- nothing under `scripts/` changes;
- no living doc is edited.

The aim is `CONVENTIONS.md#comment-why-not-what`: no provenance or history, a quotation only in
its target's own words, and the *why* kept. Check every comment you touch against the **code** or
the cited doc, never against the old comment. Line numbers are as of `4695336`.

## 1. Plan-item ids

Drop the id and keep the sentence's reason.

- `src/engine/rng.ts:48`: "copy of the mulberry32 math (B-2)."
- `src/engine/rng.test.ts:64`: "// B-2: exactly one implementation …"
- `src/engine/effect-types.ts:337`: "(over every perk's effects, B-9 -- perks are stat-modifier
  carriers too)"

## 2. Review and history words

- `src/engine/generation.test.ts:180`: "// Nit (review): `ref` is spread only when defined …".
  Drop "Nit (review):".
- `src/engine/combat.ts:269`: "The action executors (attack/cast/defend/provoke/wait) all moved to
  actions.ts". Say where they are: they live in `actions.ts`, and `combat.ts` only orchestrates the
  turn skeleton.

## 3. A creature that doesn't exist

There is no "Sporch's Reaper". The Burning-gated `conditional-damage-bonus` is the **Sporch
Ashborn** (`src/data/traits/rotcap-hollow.ts:362`, `has-status burn` on the target).

- `src/engine/__golden__/golden-conditional-damage-bonus.fixture.ts:1-2`: "(Cull the Weak / Ambusher
  / Gloomjaws / Sporch's Reaper-shaped)". Name the Sporch Ashborn, or name no fourth creature.
- `src/engine/conditions.test.ts:323`: "Ambusher/Sporch's Reaper shape ("+% dmg to Webbed/Burning
  targets")". Name the Sporch Ashborn. The parenthesis is a quotation of nothing, so drop its quote
  marks.

## 4. The Sorcerer starter's old description

`specializations/sorcerer.md#starter-glyphmoth-seer` describes the trait as an **innate spell**
(Arcane Bolt, not a gem) "plus a 50% chance at the end of its turn to cast a random equipped
spell". Three comments still quote an older description:

- `src/data/traits/starters.ts:11`: `/** "50% chance on-turn-end to cast a random equipped spell."`.
  Use the doc's exact words in quotes, or drop the quote marks and state it plainly.
- `src/data/traits/starters.ts:16-17`: "The "grants one spell as a permanent extra gem" half is
  `innate-spell { spell: ARCANE_BOLT }` instead of …". The quoted half is gone from the file, and
  it calls the innate spell a gem. State what the code does: the innate spell is an
  `innate-spell { spell: ARCANE_BOLT }` effect on the trait rather than a fixed `equippedSpells`
  loadout, so it travels through fusion. Keep the rest of the paragraph's *why*.
- `src/engine/__golden__/golden-sorcerer-starter.fixture.ts:4`: the same quotation as `:11`; treat
  it the same way.

## 5. Rewrap leftovers

- `src/engine/resolution.ts:1235` is 150 columns. Rewrap the tick block (`:1231-1241`) at the
  width of the lines around it (about 100).
- Three inline code spans are split across two lines, leaving an unpaired backtick on each line.
  Rewrap each so the span sits whole on one line:
  - `src/state/store.ts:266-267`: `` `{ ok: false, reason `` / `` }` ``
  - `src/engine/__golden__/golden-b6-provoke-stun-cleanup.fixture.ts:7-8`: `` `action-lock `` /
    `` { scope: 'all' }` ``
  - `src/engine/resolution.ts:1234-1235`: the tick formula (it goes with the rewrap above)

  Then scan your final tree: list every comment line that differs from `main`'s and holds an odd
  number of backticks. A span that a rewrap on this branch split goes back on one line; one that
  `main` already wrapped stays. Report the count.

## Proof, as before

- **`comment-proof origin/main --mask evidence/mask.json`** passes. No title changes in this round,
  so the mask stays as it is; if one does change, its entry's `new` changes rather than gaining a
  second entry. Refresh `evidence/comment-proof.txt`.
- **All gates green**, including `comments`, `citations` and `budgets`.
- **Test count** unchanged file by file.
- **Fixtures:** every fixture's exports are still deep-equal to `main`'s
  (`evidence/fixtures-compare.txt`).
- **Evidence and record:** add the rows these items change to `history-markers.md`, `bare-ids.md`
  and `quotations.txt`, and update `record.md`'s counts if they move.
- **Report:** write `report-r3.md` with one line per item above saying what you did, and the
  backtick count from item 5.
- **If an item is wrong** because the code says otherwise, report it and leave the comment as it
  is.
