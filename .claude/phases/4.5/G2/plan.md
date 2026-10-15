# Plan — 4.5-G2: The demo, the hub

Read: `CLAUDE.md`, `coding-rules.md`, the kickoff and G2 brief, `CONVENTIONS.md`,
`phases/4.5/brief.md` (hub, store use, tests and verification, demo golden rule, assumptions),
G1's record, `spec/store.md` (store actions, how actions fail, collection shape), `spec/creatures.md`
(instance, souls, roster and party), `spec/progression.md` (perk points, spending, inert perks,
swapping), the G1 `src/app` and `src/ui` files the kickoff names, `store.ts` (whole),
`rewards.ts`, `data/creatures.ts`, `data/registries.ts`, `data/specializations.ts` (`PerkDef`,
`resolvePerkEffects`), the known-inert list in `specializations.test.ts`, and the policy header,
`orderedParty` and `isFunctionalPerk` of `balance-sim.ts`. No spec file beyond the kickoff's list
is reached. No conflict found between the docs and the kickoff.

## Approach

The hub is a second column of thin components (`src/ui`) over pure `src/app` helpers. Each helper
takes the store state (or the `GameActions` it calls) as an argument and returns plain rows, text
or a result; components render rows and call the helper's action function, which makes exactly the
store call. No engine, store or data file is touched, so the golden policy holds by construction.

- **State read:** components read the store as G1's do, `useGameStore()` with no selector (one
  stable object), and derive in a helper. No `[...collection.values()]` in a selector.
- **Viewer untouched:** `RunScreen` and `DescentViewer` are not edited. The hub is a sibling of
  `RunScreen` in `App`, never a parent, a wrapper or a tab, and holds no state in the viewer's key,
  so a hub action re-renders the hub and the side panel only; the viewer's timer effect is keyed
  on its own `timerKey`/`delay` and does not restart. (A hub action changes the store, and
  `RunScreen` subscribes to the whole state, so it re-renders; the viewer inside it is the same
  element with the same key and props, and its effect dependencies are unchanged.)
- **Instance identity:** an instance's name comes from `staticCreatureIdFor(instance)` then
  `creatureName(DEMO_NAMES, id)`; its template from an exact-id `Map` over
  `ALL_CREATURE_TEMPLATES`. A fusion source throws (let it); a miss throws.
- **Layout:** `App` gets `onNewGame` for the hub and renders three columns: run screen, hub, side
  panel. One CSS addition in `src/index.css` for the extra column.

## Module changes, by file

### New, `src/app` (pure, each with a test)

- **`instanceLabels.ts`**
  - `labelInstances(collection, names): ReadonlyMap<InstanceId, string>`. Name per instance as
    above; counts per name over the **whole collection** (party and bench together), the ordinal
    `k` by collection (`Map` insertion) order. Label `"<name>, Lv <level>"` for a unique name,
    `"<name> #<k>, Lv <level>"` for a shared one. Lookup by exact instance id; `labelOf` throws on
    an id not in the map. Everything that shows an instance (dropdown options, creature lines)
    reads this one map.
- **`creatureLine.ts`**
  - `HubContext = { names, templates, traits, spells, config }` and `HUB_CONTEXT` built from
    `DEMO_NAMES`, a `Map` over `ALL_CREATURE_TEMPLATES` by id, `DEFAULT_REGISTRIES.traits`,
    `ALL_SPELLS`, `DEFAULT_BALANCE_CONFIG`.
  - `creatureLine(instance, label, ctx): CreatureLine = { label, xp, affinity, rarity, script,
    traits, gems }`: `xp` is `"<instance.xp> / <xpForNextLevel(level, ctx.config)>"`; affinity and
    rarity from the template, capitalized (ASSUMPTION 2); `script` is
    `instance.scriptId ?? template.defaultScriptId`; `traits` the template's `innateTraitIds`
    through `ctx.traits` (`Trait.name`); `gems` is `instance.gems` mapped through `ctx.spells` by
    id to `Spell.name`, `null` to `"empty"`, as many entries as the array holds. Any miss throws.
  - `creatureLineText(line): string`: `"<label> | XP <xp> | <affinity> | <rarity> | script <id> |
    traits <a, b | none> | gems <x, y, empty>"` (ASSUMPTION 3).
- **`partyRows.ts`**
  - `partyRows(state: Pick<GameState,'collection'|'activeParty'>, ctx): PartyRow[]`, one per
    `activeParty` entry (so `PARTY_SIZE` long, no literal 6): `{ slot, selected: InstanceId | null,
    options, line: CreatureLine | null }`. `options` is `[{ value: '', label: 'empty' }, ...every
    owned instance, collection order, { value: id, label }]`, party members included. The slot's
    `line` is the creature line of its occupant.
  - `benchRows(state, ctx): CreatureLine[]`: every owned instance not in the party, collection
    order (the Collection section).
  - `pickParty(store: Pick<GameActions,'setPartySlot'>, slot, value): SetPartySlotResult`: `''` maps
    to `null`, anything else is the instance id; **one** `setPartySlot(slot, id | null)` call and
    its result returned. No pre-emptying, no moving the occupant.
- **`soulRows.ts`**
  - `soulRows(state: Pick<GameState,'soulProgress'>, store: Pick<GameActions,'canSummon'>, names):
    SoulRow[]`: every `soulProgress` entry above 0, in the map's order, `{ creatureId, name
    (creatureName), percent, can: CanSummonResult }`; `percentText` is `"<n>%"`.
  - `summonCreature(store, creatureId)`: one `summon` call, result returned.
- **`perkRows.ts`**
  - `INACTIVE_LABEL = "inactive (its system isn't built yet)"` (ASSUMPTION 1).
  - `isInactivePerk(perk): boolean = resolvePerkEffects(perk, perk.maxLevel).length === 0`.
  - `perkRows(spec, perkSpend): PerkRow[]`: `{ id, name, level (perkSpend.get(id) ?? 0), maxLevel,
    costPerLevel, inactive }`, in the spec's data order.
  - `parsePerkLevelField(text): number`: trimmed `/^\d+$/` then `Number`, else `NaN`, the same free
    text pattern as `parseFloorField`.
  - `checkPerkField(store: Pick<GameActions,'canSetPerkLevel'>, perkId, text): SetPerkLevelResult`
    and `setPerkFromField(store: Pick<GameActions,'setPerkLevel'>, perkId, text)`: parse, then one
    `canSetPerkLevel` / `setPerkLevel` call. Never throws: `NaN` reaches the store and comes back
    `invalid-level`.
- **`specSwitcher.ts`**
  - `otherSpecs(chosenSpec: string | null, specs = SPEC_CHOICES)`: the specs whose id is not the
    chosen one, data order (all of them while none is chosen).
  - `SPEC_SWITCH_NOTE = 'Switching refunds every perk.'`
  - `switchSpec(store: Pick<GameActions,'setSpec'>, specId)`: one `setSpec` call. Only ever called
    with an id from `otherSpecs`.
- **`debugBoss.ts`**
  - `bossChoices(): { id, name }[]` from `BOSS_CREATURES_BY_ID` (insertion order, named by the
    creature's `name`; `bossName(id)` is the same lookup). `recordBoss(store, bossId)`: one
    `recordBossKill` call.
- **`refusals.ts`** (existing, gains three functions): `summonRefusalText(SummonFailureReason)`,
  `partySlotRefusalText(SetPartySlotFailureReason)`, `perkRefusalText(SetPerkLevelFailureReason)`,
  each an exhaustive `switch` with the `never` default, in the existing style. Wording in
  ASSUMPTION 4.

### New, `src/ui` (thin; no test, covered by the click-through)

- **`Hub.tsx`**: renders the sections below plus **New game** (calls `onNewGame`) and the Debug
  block. Holds no game state.
- **`PartySection.tsx`**: six rows; each a `<select aria-label="Party slot <n>">` of `options`
  whose `onChange` calls `pickParty`, with the occupant's `creatureLineText` beneath.
- **`CollectionSection.tsx`**: one line per `benchRows` entry. A section heading notes the
  party's lines are in Party (ASSUMPTION 6).
- **`SoulsSection.tsx`**: a row per `soulRows` entry, name, `percentText`, a **Summon** button
  disabled when `can.ok` is false with `summonRefusalText(reason)` as text beside it.
- **`PerksSection.tsx`** and **`PerkRow`** (inside it): per perk: name, `level / max`, cost per
  level, `INACTIVE_LABEL` when inactive, a text field draft (`useState`, initial the current
  level), a **Set** button disabled when `checkPerkField` is not ok with `perkRefusalText` as
  text; **Refund all** calls `refundAllPerks`. Rows are keyed by `spec.id + perk.id`, so a switch
  drops the old spec's drafts. Level / max reads `perkSpend` through `perkRows`, never the draft.
- **`SpecSection.tsx`**: the other specs as buttons calling `switchSpec`, plus the note. No
  confirmation prompt.
- **Debug block** (in `Hub.tsx`): a boss `<select>` and **Debug: Record boss kill**.
- **`App.tsx`**: `onNewGame={() => setStarted(false)}`; no `newGame` call.

### Existing files changed

- `src/app/refusals.ts` gains the three functions; `refusals.test.ts` gains cases (none changed or
  removed).
- `src/app/App.tsx`, `src/index.css`: layout only.
- Nothing under `src/engine`, `src/state` or `src/data`; nothing in G1's viewer, floor picker,
  start screen or side panel.

## Golden policy (restated)

**Byte-identical** (`phases/4.5/brief.md#demo-golden-rule`). G2 changes no engine, store or data
code: every golden, engine and store test, the three `balance-ci-*` tests and the corpus digest
stay byte-identical; `git diff --stat origin/main -- src/engine src/state src/data` is empty.
Existing `src/app` tests only gain cases (`refusals.test.ts`). If the hub seems to need an engine,
store or data change (an export, a field, a comment fix), I stop and ask. The report lists every
changed test file in its count, reconciled against `main` (1993 → 2152 after G1).

## Mechanisms and the test that fails without each

Every test is new, in `src/app`, titled for what it pins. Real-content stores come from
`createGameStore()`; a soul is made 100% with `store.setState({ soulProgress })` in the test (the
store file is untouched).

| Mechanism | Site(s) | Test, and what breaks it |
| --- | --- | --- |
| Ordinal counted over the whole collection | `labelInstances` (one site; both consumers read it) | `instanceLabels.test`: a hand-built collection with two Snapjaws, one in the party and one benched, and a third creature, gives "Snapjaw #1, Lv n" / "Snapjaw #2, Lv n" and the third bare. Fails with the count per section (both "#1") and with the ordinal dropped (both bare). A real-store case summons a duplicate and checks the first's label gains "#1". |
| Same label in dropdown and line | `partyRows.options`, `partyRows.line`, `benchRows` | `partyRows.test`: for a duplicated-name collection, each option's label equals its line's label equals `labelInstances`. Fails if either consumer builds its own label. |
| Creature line fields | `creatureLine` | `creatureLine.test`: for each spec's starter (switching specs on one real store), the Unicorn and a summon: name, level, `xp`, affinity, rarity, script, trait names, gem names, with template-derived values as literals read from the data when writing the test and gem names compared with an independent `ALL_SPELLS` lookup of the stored ids. Fails with ids instead of names (traits, spells), with the role script missing, with a hard-coded 3 gems (a 2-entry array prints 2). |
| XP threshold from the config | `creatureLine.xp` | An inline config `{ ...DEFAULT_BALANCE_CONFIG, xpCurveCoefficient: 7, xpCurveExponent: 1 }` on a level-3, xp-4 instance reads `"4 / 21"`; the default config reads `"4 / 180"`. Fails with `20 × level²` written out. |
| `null` gem prints empty | `creatureLine.gems` | An instance with `gems: [id, null, id]` prints `['<name>', 'empty', '<name>']`. Fails if a `null` throws or is dropped. |
| Misses throw | `creatureLine`, `labelInstances` | Unknown template id, unknown trait id and unknown spell id each throw (`toThrow(id)`); a fusion source throws. Fails with a fallback to the id. |
| One `setPartySlot` per pick, `''` to `null` | `pickParty` | `partyRows.test` with a spy store: a pick of an instance gives one call `(slot, id)`, "empty" one call `(slot, null)`, no other call. Fails if the helper moves the occupant itself (a second call) or passes `''`. |
| Swap semantics are the store's | `pickParty` over the real store | A real store: picking a benched instance for an occupied slot benches the occupant; picking a party member for another slot swaps the two. Fails if the helper pre-empties a slot. |
| Six rows from `activeParty` | `partyRows` | Rows count equals `activeParty.length` and `PARTY_SIZE`; a store built with a shorter inline `activeParty` state gives that many rows. Fails with a literal 6. |
| Options are "empty" plus every owned instance | `partyRows.options` | The party option list for a 4-instance collection is `['', 4 ids]` in collection order, party members included; fails if members are filtered out. |
| Souls rows | `soulRows` | Only entries above 0%, named, with `%` and `canSummon`'s reason: 0 excluded, 40 gives `soul-incomplete`, 100 gives `ok`. Fails with 0% rows shown or an id as name. |
| Summon at 100% twice | `summonCreature` | Real store at 100%: two summons give two instances, labelled "#1" and "#2", first into a free slot, and a full-party summon lands on the bench (not in `activeParty`). Fails if the helper blocks a repeat. |
| Perk rows read `perkSpend` | `perkRows` | After `setPerkFromField`, after `refundAllPerks` and after a switch, `level` matches `perkSpend` (a perk absent from it is 0), whatever a draft says. Fails if it reads a draft. |
| Level field parsing | `parsePerkLevelField`, `checkPerkField`, `setPerkFromField` | `""`, `"abc"`, `"2.5"`, `"-1"` and `maxLevel + 1` each give `invalid-level` from both the check and the set, none throws; `" 3 "` is 3. Fails with `Number()` (`""` is 0, `"2.5"` is not refused by the parser). |
| `over-budget` one past the free points | `checkPerkField` | After one `recordBossKill`, a perk whose max spend exceeds 100: level `floor(100 / cost)` is ok, `+ 1` is `over-budget`. Found generically in the test, not hard-coded. |
| Inactive label | `isInactivePerk` | Exactly the nine ids of the known-inert list (copied into the test) over every perk of every spec; and equal to `isFunctionalPerk` negated on every perk (the test imports the simulator's predicate, the app does not). Fails with any added or missing id, or an inverted predicate. |
| Spec switcher offers the other specs | `otherSpecs` | For each chosen spec, the other two in data order; with `null`, all three. Fails if the current one is offered. |
| Switch refunds and grants the starter | `switchSpec` over a real store | `recordBossKill`, `setPerkLevel`, switch: `perkPointSummary().spent` is 0 and the new spec's starter is owned. Fails if the helper calls anything but `setSpec`, or `setSpec` isn't reached. |
| Debug boss pick | `bossChoices` | The ids equal `[...BOSS_CREATURES_BY_ID.keys()]`, names equal each boss creature's name; `recordBoss` twice on a real store changes `bossesCleared` once. Fails with free text or a non-boss id in the list. |
| Refusal text | `summonRefusalText`, `partySlotRefusalText`, `perkRefusalText` | `refusals.test`: a `Record<Reason, true>` per union (a new reason without a row is a type error), distinct non-empty plain text for each, no phase ids (the file's existing check), and the reasons the real store produces all have text (`soul-incomplete`, `unknown-creature` through `summon('nope')`, `slot-out-of-range` and `unknown-instance` through `canSetPartySlot`, all four perk reasons). Fails with a missing `case` (the exhaustive switch throws). |
| New game never touches the store | `App` | Not unit-testable (no Testing Library); the click-through checks the side panel still shows the old run after New game, and that Start then resets it. |

The components stay untested by design (kickoff); the click-through covers them.

## The first-boss-clear run

One-off tools outside the repo, in the scratchpad; their printed tables go in `evidence/`.

1. **Scan.** A scratch Vitest file (outside `src/`, run through a scratch config rooted at the repo
   with `include` pointing at it; ASSUMPTION 8) drives `createGameStore()` for each candidate
   `(spec, seed)`: `newGame({ seed })` → `setSpec` → `runScriptedIntro`, then the simulator's
   policy: summon each id the first time its soul reaches 100%; party = `orderedParty` over the
   collection via `setPartySlot`; after a clear push `deepestFloor + 1`, after a failed push re-farm
   `deepestFloor` (a failed floor-1 push retries floor 1); no perks bought. Stops at the floor-10
   clear or a run cap (60, ASSUMPTION 9). Candidates: the 3 specs × seeds 1..40 (the simulator's
   list). It logs every action (`summon id`, `setPartySlot slot id|null` only where the slot
   changes, `descend floor`) and the deepest floor after each descent. Pick: fewest floor runs to
   the clear; ties by spec data order then seed. The table (spec, seed, floor runs per candidate,
   the pick) goes to `evidence/first-clear-scan.md`.
2. **Replay.** A browser script (in-page JavaScript through the browser tooling) replays the
   pick's log on the real UI: Start with the spec and seed, then per logged action sets the
   floor field and clicks **Descend**, clicks the right **Summon**, or selects the instance id in
   a `Party slot n` dropdown (option values are instance ids). After each descent it reads the
   side panel's "Deepest floor" and compares it with the scan's; the per-descent log goes to
   `evidence/first-clear-replay.md`. No extra `descend`, no trial run in this session: the other
   click-through items run in separate sessions.
3. On screen after the clear: the boss result line as a first clear with +100 perk points, the side
   panel at 100 earned, and those points spent on a perk through the level field.

If the scan finds no candidate that clears within the cap, I stop and report (the cap, the
candidates) rather than widening the search or the policy.

## Other click-through (separate sessions from the boss run)

Party: swap of two party slots, a benched instance onto an occupied slot, a slot emptied, the
whole party emptied (**Descend** greyed with `empty-party`), refilled; a fight after a reorder
shows the new line-up order. Collection: lines for party and bench, gems by spell name. Souls:
**Summon** greyed with its reason below 100%; summon at 100% into a free slot and one into the
bench; a second summon labelled "#2". Perks: Debug record for each boss and a repeat; levels
bought; `invalid-level` and `over-budget` on screen; an inactive perk labelled; **Refund all**.
Spec switcher: only the other specs; a switch after Debug-bought perks, spent back to 0, new
starter in the party or collection. **New game** to the start screen, fresh Start. Hub actions
mid-playback (a summon, a reorder, a perk) with the reveal running on at 1× at about two beats a
second. Results to `evidence/click-through.md`.

For the scripted runs, every hub control gets a stable accessible name (`aria-label`s on the
dropdowns, button text as in this plan), so scripts need no CSS paths.

## Gates

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`,
`npm run docs:check -- citations`, `npm run docs:check -- comments`. No provenance in a comment,
test title, identifier or string literal. Comments cite spec anchors (for example
`spec/store.md#store-actions`, `spec/creatures.md#instance`) and say why.

## Report notes (not edits)

- **Spec questions** to raise, none blocking: the brief says a creature line shows "its three
  gems", while the data holds "one per regular gem slot"; the hub prints what the array holds
  (the kickoff says the same). `store.ts` comments that mention `src/app` helpers I am not
  changing.
- **Content changes:** none.
- **To delete:** none expected.

## Assumptions checklist

- [ ] **ASSUMPTION 1:** the inactive label reads exactly "inactive (its system isn't built yet)",
      as the kickoff proposes (the (G1, G2) brief assumption). Confirmed unless corrected.
- [ ] **ASSUMPTION 2:** affinity and rarity print from the template's ids with the first letter
      capitalized ("Wit", "Common"), not through a new display table.
- [ ] **ASSUMPTION 3:** a creature line is one text line, fields separated by " | " in the order
      label, XP, affinity, rarity, script, traits, gems; "none" for no traits, "script <id>" for
      the role script, gems as spell names with "empty" for a `null` slot; the helper also returns
      the fields structured, and tests assert on those.
- [ ] **ASSUMPTION 4:** refusal wording. `soul-incomplete`: "Not enough soul: summoning needs
      100%."; `unknown-creature`: "That creature can't be summoned."; `slot-out-of-range`: "That
      party slot doesn't exist."; `unknown-instance`: "You don't own that creature."; `no-spec`:
      "Pick a specialization first."; `perk-not-in-spec`: "That perk isn't in this
      specialization."; `invalid-level`: "The level must be a whole number from 0 to the perk's
      maximum."; `over-budget`: "Not enough free perk points for that level." Each distinct and
      free of phase ids.
- [ ] **ASSUMPTION 5:** the perk level field starts holding the perk's current level when its row
      mounts; **Set** is a button (the field does not apply on change), disabled with the
      refusal shown whenever the draft would be refused.
- [ ] **ASSUMPTION 6:** the Party section shows the creature line of each occupied slot under its
      dropdown, and the Collection section lists only the bench, as the brief says ("every owned
      instance outside the party; party rows use the same line").
- [ ] **ASSUMPTION 7:** layout is three columns (run screen, hub, side panel) with one CSS rule in
      `src/index.css`; this is "placing the hub beside" G1's screens, not a change to them. The
      hub is shown only after Start, with the run screen.
- [ ] **ASSUMPTION 8:** the scan runs as a scratch Vitest file outside `src/` through a scratch
      config in the scratchpad. If Vitest will not load files outside its root, I stop and ask
      before putting any scratch file in the repo (no new dependency either way).
- [ ] **ASSUMPTION 9:** the scan's candidate set is the 3 specs × seeds 1..40 with a cap of 60
      floor runs per candidate; the pick is the fewest floor runs to the floor-10 clear.
- [ ] **ASSUMPTION 10:** the spec switcher has no confirmation prompt and the Debug boss select
      lists every boss in `BOSS_CREATURES_BY_ID`'s order whether or not it is cleared.
- [ ] **ASSUMPTION 11:** soul progress rows are in `soulProgress` map order (insertion), not sorted
      by percent or name, and the percentage prints as `"<n>%"` with no rounding (gains are whole
      numbers per rarity).
- [ ] **ASSUMPTION 12:** the scan and replay use the unmodified default store; its summon policy
      relies on the simulator's behaviour that a summon at 100% happens once per creature id.
