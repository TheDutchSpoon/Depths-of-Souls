# Kickoff — Phase 4.1 — Slice H2b1: Flickerlings and damage observation

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- `.claude/phases/4.1/H2b1/brief.md`: this slice's brief.
- `.claude/briefs/phase-4.1-implementation-plan.md`, these headings only:
  - "Slice plan and sequencing rules" (the golden rules and "Content docs stay in sync");
  - "The split: H1, H2a, H2b1, H2b2, H2c" (the H2b1 row) and "Why H2b ships as H2b1 then H2b2";
  - "4.1-H2a — damage rules" (what's built) and "4.1-H2b2 — status rules" (what is **not** yours);
  - "Acceptance (4.1-H)", the H2b1 bullet;
  - the Assumptions checklist, items 112, 115, 116, 130–132, 137, 138 and **140** (the Wick's
    gate and heal target, decided at this kickoff; it refines 116).
- `.claude/phases/phase-4.1-fix-and-consolidation.md`, the "4.1-H2a" section: its predicted
  changed set, its mutation tables and its digest attribution are the shape this report follows.
- Content: `.claude/content/glimmerdark.md` (all of it; the Flickerlings, the spells and the
  "Phase 4.1 — decided changes" section), `.claude/content/enemy-behaviour.md` (the `support`,
  `caster` and `striker` roles), `.claude/species/species-locked.md` (the Biome 2 table and the
  Glow note).
- CONVENTIONS: "Action reactions: actor-self hooks vs. observation (routing rule)" including
  "Damage observation"; "Hook execution model" (the damage-path hook order, the hook vocabulary);
  "Damage channels and the Additional" (the cost rule, the tick test); "Response vocabulary";
  "Loop safety".
- Code, before planning:
  - `engine/resolution.ts`: `fireHook` (the observation filter), `applyDamageAndEmit`,
    `applyCostDamage`, `executeResponse`'s `deal-damage` branch, `fireDeathObservers`;
  - `engine/actions.ts`: the five `on-action-observed` call sites;
  - `engine/effect-types.ts` (`ObservationFilter`, `TriggeredDef`, `ResponseTarget`),
    `engine/target-selectors.ts`, `engine/conditions.ts` (`ally-count`, `hp-percent`),
    `engine/scripting-types.ts` (`Condition`, `HpSubject`);
  - `data/traits/glimmerdark.ts`, `data/species/glimmerdark.ts`, `data/spells/glimmerdark.ts`,
    `data/spells/index.ts` (`ALL_SPELLS`), `data/statuses.ts` (`GLOW`);
  - goldens: `golden-glowfly-detonator` (retired), `golden-resonant-harmonize` and
    `golden-resonant-overtone` (the observer's current users), `golden-h2a-cost` (the cost and the
    tick test), `golden-consume-stacks` (stays, untouched);
  - tests that read the deleted content: `engine/status-containers.test.ts` (borrows the real
    `glow`), `state/store-gems.test.ts`, `data/spells/index.test.ts`, `data/roles.test.ts`,
    `data/species/glimmerdark.test.ts`, and `engine/__corpus__/corpus.ts`.

## Scope

This slice delivers two things. **Damage observation** (ASSUMPTION 115): the one observation
system also reacts to damage events, filtered by the damaged creature's relationship to the
observer and by whether the damage was self-inflicted, which is exactly the cost case (ASSUMPTION
132). **The Flickerlings replace the Glowflies** (ASSUMPTION 116), with the content that goes with
them: Glow deleted, Beacon Charge granting Grant Act First instead of Glow, Overcharge deleted,
Luminous Tide becoming Kindred Light (`kindred-light`), and Glimmerdark's affinity spread becoming
4 Wit / 3 Instinct / 5 Violence / 4 Endurance / 2 Vitality. The Wick is decided (ASSUMPTION 140):
it burns only when a living ally **other than itself is below max Health**, and it heals the
lowest current HP among those hurt allies. With every other ally at full Health, or none alive, it
neither burns nor heals. The plan proposes the observer's exact shape, the condition that
expresses the gate and the target that expresses the heal, and pins where damage observation sits
in the damage-path hook order. **Not in scope:** stacking
(`cap`, `stacks`, `consume-stacks`, `consumed-stacks` and the stack count on events stay for
H2b2), DoT ticks (they keep today's path and source), the applier snapshot, the Health remap of
any other creature, and any number tuning (H2c).

## Golden policy

**Deliberate, listed.**

- `golden-glowfly-detonator` is retired: its content is deleted.
- **Every other golden is byte-identical**, compared by importing the fixtures. A golden that
  changes anyway is a bug or a missed prediction: stop and say so.
- Tests that read Glowflies, Glow, Overcharge or Luminous Tide change, each listed with its reason.
  Expected changes: `status-containers.test.ts` (the borrowed `glow` becomes a fixture status of
  the same shape, so only the status id moves), `store-gems.test.ts` (the biome-2 pool loses
  Overcharge and the pick that read Luminous Tide reads Kindred Light), `spells/index.test.ts` (the
  append-only pin), `roles.test.ts` and `species/glimmerdark.test.ts` (the creature ids, and the
  Flickerlings' Health on the 20–45 scale).
- The corpus digest is regenerated **once**, through `npm run corpus:update`, every changed fight
  attributed to one cause: the species swap, the spell-pool change (Overcharge's deletion), the
  Beacon Charge change, the Kindred Light change, or the observer.
- The plan lists the predicted changed set (tests, goldens, digest causes) **before** anything runs.

## Traps

- **The observation filter is skipped when `observed` is absent.** `fireHook` reads
  `observationFilter` only when the caller passes `observed`. A damage observation fired on
  `on-action-observed` without it would make every Resonant fire on every hit. Whatever the shape,
  the Resonants must never see a damage event, and a test must show it.
- **Self-inflicted is the cost classification, never `source === target`.** In this slice a DoT
  tick still has its bearer as both source and target (H2b2 moves the source to the applier), and
  a direct action landing on its own actor (a Confusion redirect, a spell effect on its caster)
  has the same ids. Neither is self-inflicted (ASSUMPTIONS 115, 137). The information exists only
  in `executeResponse`'s branch choice (`applyCostDamage` versus the tick path), so it has to be
  carried from there, not re-derived from the event.
- **A zero cost is a full no-op** (ASSUMPTION 132): no event and no hooks, so nothing to observe.
  Its `TriggerFired` still stands (ASSUMPTION 138).
- **Pin the observer's place in the damage-path hook order**, and say what a lethal cost does: the
  Wick's burn can kill it, and the Flare's reaction and the Last Gleam's `on-ally-death` then meet.
  The order is CONVENTIONS', so the plan proposes it and the review writes it there.
- **No existing condition expresses the gate.** `ally-count` and `hp-percent` (subject `ally`)
  both include the bearer, so "another ally is hurt" needs a new variant or an option on one. A
  condition change touches the scripting `Condition` union, which players author (saved scripts,
  the interpreter, Phase 6's editor): the plan says whether the new form is valid in a script
  rule, and if not, how a validator keeps it out. Hurt means `currentHp` below effective max
  Health, compared in integers.
- **Don't add a bearer exclusion to `TargetSelector`.** It is the same player-facing vocabulary.
  Exclude the bearer, and filter to hurt allies, on the response side. `lowest-hp-ally` includes
  the bearer and every full-Health ally today.
- **The gate and the target read one pool.** "Other living allies below max Health" is both the
  condition and the heal's candidate set; if they are two pieces of code, a test shows they agree
  (the gate never passes with the target empty, and the reverse).
- **Gate both Wick effects, not only the burn.** A heal whose target resolves to nobody still logs
  its `TriggerFired` (a targeting fizzle), so the no-burn goldens would show a stray trigger. Order
  the effects burn then heal, and evaluate the heal's gate after the burn: the burn can't change
  whether another ally is hurt, but `fireHook` re-checks `alive` per effect, so a lethal burn skips
  the heal (Last Stand can still save it).
- **The burn's label.** A flat `deal-damage` without a `damageSource` is labelled `'dot'`. The tick
  test ignores labels (ASSUMPTION 131), and so must the observer, but the plan says which label the
  burn carries. Its `flatAmount` is a `StatPercent` of the bearer's Health with no `statusId`, which
  is what puts it on the cost path.
- **`ALL_SPELLS` is append-only: its order maps RNG rolls to spells.** Rename Luminous Tide **in
  place** (same index), don't move or re-append it. Deleting Overcharge shifts the later indices,
  which changes only the pools that held Overcharge (Wit, biome 2 and deeper); the plan predicts
  which fights that touches.
- **Swap the species in place.** The Flickerlings take the Glowflies' slot in
  `GLIMMERDARK_SPECIES_POOL`, with the creatures in rarity order (Wick common, Flare uncommon, Last
  Gleam rare), so the swap is the only generation change.
- **The Flickerlings' Health is on the new scale now** (38 / 25 / 28) while every other creature
  stays on 10–30 until H2c, whose remap must then skip them. The Glimmerdark range test changes
  for those three only.
- **Stacking stays.** `consume-stacks` loses its last real user but is H2b2's to delete;
  `golden-consume-stacks` uses its own fixture Glow and stays byte-identical.
- **You can't delete files.** When you reach the step that removes the Glowfly traits, stop and ask
  Duncan to delete `golden-glowfly-detonator.fixture.ts` and `.test.ts`, then run the gates. Never
  neutralise a test by emptying or skipping it. Scratch work stays outside the repo.
- **Content docs fold now.** Fold the H2b1 items of `glimmerdark.md`'s "Phase 4.1 — decided
  changes" into its body (the Flickerlings section, the statuses, the roles table, the spells table
  and the intro paragraph's spell list) and delete them from the pending section. The
  single-instance and Health items stay pending. Fix code comments that name Glow, Overcharge or
  Luminous Tide (the Rotcap Hollow spell and species comments included).

## Must stay green

- All five gates: `npm run test`, `npm run lint`, `npm run format:check`, `npm run build`,
  `npx tsc -b`.
- Every golden except the retired one, byte-identical: in particular `golden-resonant-harmonize`
  and `golden-resonant-overtone` (the observer's existing users), `golden-consume-stacks`,
  `golden-loop-safety` and every `golden-h2a-*`.
- The frozen double-resolve determinism test and the deep-frozen golden runner.
- `corpus-coverage.test.ts`: every spell (Kindred Light included) cast with its effects landing,
  and every status applied, with no stale exemption.
- `balance-sim.test.ts`, the data validators and the `perform-action` data test.

## The PR must prove

- The predicted changed set, written in the plan before the first run, against what changed.
- A hand-derived focused golden for each case in the brief, each failing with its mechanism
  removed: the observer firing on an ally's cost; not firing on an ordinary hit, a DoT tick, a
  direct action landing on its own actor, or a zero cost; the Wick's burn and heal; its heal
  skipping itself (the Wick the most hurt); its heal picking the lowest-HP **hurt** ally over a
  lower-HP ally at full Health; no burn with every other ally at full Health; no burn with no one
  else alive; the Last Gleam on an ally's death.
- A mutation table (as H2a's), each mutation killed by a named non-digest test: damage observation
  removed; the self-inflicted filter dropped; self-inflicted read as `source === target`; the
  relationship filter dropped (an enemy's cost observed); Resonants reached by a damage event; the
  Wick's gate removed; the gate counting the bearer (a hurt Wick burns with everyone else full);
  the bearer exclusion removed (the Wick heals itself); the hurt filter removed from the target (it
  heals a full-Health ally); a heal with no target left ungated.
- No Glowfly, Glow, Overcharge or Luminous Tide left in `src/data` (a grep, shown), and the
  Flickerlings, Beacon Charge, Kindred Light and the affinity spread matching `glimmerdark.md`.
- Every golden except the retired one byte-identical, compared by importing the fixtures.
- The digest regenerated once, with every changed fight attributed to one cause, using scratch
  switches outside the repo as H2a did. The observer alone, with the content unchanged, reproduces
  the committed digest byte for byte. At least one corpus fight has the Flare observing a Wick
  cost; if no generated fight does, append one.
- The test count reconciled file by file against `main`, and the files Duncan deleted listed.
- Spec questions, so the docs are updated before H2b2's kickoff.

## Docs edited

- `.claude/briefs/phase-4.1-implementation-plan.md`: moved the H2b1 section to this mailbox's
  `brief.md`, leaving its heading and a pointer; added ASSUMPTION 140 (the Wick burns only when
  another ally is hurt and heals the lowest-HP hurt ally; design owner, at this kickoff).
- `.claude/phases/4.1/H2b1/brief.md`: new; the H2b1 section, moved byte for byte. Its "the plan
  proposes the gate" line predates ASSUMPTION 140, which now decides the gate's meaning.
- `.claude/content/glimmerdark.md`: the Wick's row in "Phase 4.1 — decided changes" says it heals
  the lowest-HP injured ally and doesn't burn when every other ally is at full health.
- `.claude/species/species-locked.md`: the Wick's row in the Biome 2 table carries the same gate and
  target.
