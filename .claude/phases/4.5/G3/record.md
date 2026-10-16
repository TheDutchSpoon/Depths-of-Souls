# Record — 4.5-G3: The demo, adjustments, trait and perk text

Two adjustments to the run-loop demo and one data addition. It changes no engine, store or e2e code, and no
golden, corpus entry or existing engine, store or data test.

## The viewer

**Changed:** `src/app/playback.ts` (the `waiting` phase, `START_WAIT_MS` and the timer key's special case are
gone: playback starts at fight 1, beat 0, and the first beat comes one beat interval later),
`src/app/playback.test.ts` (the cases that tested the wait go or become the first-beat cases),
`src/ui/DescentViewer.tsx` (order: speed and skip buttons, the fight title, "Party going in", the allies' and
foes' line-ups side by side, the log box, then "After the fight", the per-fight copy button, the copy status and
the descent result), `src/index.css` (`.lineups`, `.log-box`).

**New:** `src/app/followLog.ts` (`FOLLOW_TOLERANCE_PX`, `isAtBottom`, `shouldResetFollow`, pure, with
`followLog.test.ts`), `src/ui/LogBox.tsx` (the scrolling log; following is a ref read from the last scroll
event, outside the playback state and the timer key), `src/ui/useFillViewport.ts` (sets the box's height from its
document-relative top, never under ten lines, on every render of the viewer and on resize).

## The hub

**Changed:** `src/app/creatureLine.ts` (exports `templateOf`, which `creatureLine` and `soulRows` share),
`src/app/soulRows.ts` (a row's `traitLines`, one description per innate trait in the template's order; an
optional `ctx` parameter defaulting to `HUB_CONTEXT`), `src/app/perkRows.ts` (a row's `description`),
`src/ui/SoulsSection.tsx`, `src/ui/PerksSection.tsx`; their tests gain cases.

## The data

**New:** `src/data/traits/described.ts` (`DescribedTrait`), `DescribedPerkDef` and `DescribedSpecialization`
in `src/data/specializations.ts`, `traitDescription(id)` (`src/data/traits/index.ts`) and `perkDescription(id)`
(`src/data/specializations.ts`), each throwing on an unknown id; `src/data/descriptions.test.ts` and
`src/data/descriptions.types.test.ts` (the compiler test).

**Changed:** the four trait files and `STARTER_TRAITS` / `STOCK_TRAITS` are typed `DescribedTrait` and carry a
`description` (61); the three specializations and `SPECIALIZATIONS` are typed `DescribedSpecialization` and carry
one per perk (32). `Trait`, `PerkDef`, `Specialization`, `TRAIT_REGISTRY` and `SPECIALIZATIONS_BY_ID` keep their
types, so the store and engine take the described values unchanged.

## Notes

- The ten-line minimum is `10 × --log-line-height × 1em`: the `lh` unit gave a shorter box than the lines it holds.
- The height reads from the document top, so a scrolled page and a refusal or preview line appearing mid-playback
  both leave the box's bottom at the viewport's bottom.
