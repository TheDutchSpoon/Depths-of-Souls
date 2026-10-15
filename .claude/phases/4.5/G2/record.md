# Record — 4.5-G2: The demo, the hub

The second half of the run-loop demo: the hub beside G1's run screen and side panel. It changes no
engine, store or data code, and restates no game rule.

## Files changed

**Changed:** `src/app/refusals.ts` (`summonRefusalText`, `partySlotRefusalText`,
`perkRefusalText`), `src/app/refusals.test.ts` (four cases added, none changed), `src/app/App.tsx`
(the hub is a sibling of the run screen, shown after Start; New game sets the UI state back to the
start screen and never calls the store), `src/index.css` (the hub column shares the run column's
`flex: 1; min-width: 0`).

**New, `src/app`** (pure, each with a test): `instanceLabels` (one label map for the whole
collection), `creatureLine` (`HUB_CONTEXT`, `creatureLine`, `creatureLineText`), `partyRows`
(`partyRows`, `benchRows`, `pickParty`), `soulRows`, `perkRows` (`INACTIVE_LABEL`,
`isInactivePerk`, the level field through `parseFloorField`), `specSwitcher`, `debugBoss`.

**New, `src/ui`:** `Hub`, `PartySection`, `CollectionSection`, `SoulsSection`, `PerksSection`,
`SpecSection`. Controls carry accessible names: `Party slot <n>` (1-based), `Summon <creature>`,
`Level of <perk>`, `Set <perk>`, `Boss`.

**Deleted:** none.

## Tests

2152 → 2200 (+48), all in `src/app`: instanceLabels 6, creatureLine 7, partyRows 8, soulRows 6,
perkRows 9, specSwitcher 5, debugBoss 3, refusals 3 → 7.

## Golden policy

Byte-identical. `git diff --stat origin/main -- src/engine src/state src/data` is empty.

## Verification

The first boss clear (Brute, seed 10, 38 floor runs) was replayed through the UI in Edge via a scratch Playwright install; the click-through covered the hub. Evidence in `evidence/`.
