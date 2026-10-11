# Residue from the brief (4.2-H2)

Each item: the grep on `origin/main` (0126c4a, before) and on the branch (after).

### spec/responses.md#flat-mode: the "own named example" (the kickoff: already gone from src/ before this slice)

```
before: git grep -n -e 'responses.md#flat-mode`[^`]*own' origin/main -- src
after:  git grep -n --untracked -e 'responses.md#flat-mode`[^`]*own' -- src
```

### content/overgrowth.md#the-overgrowth-biome-1-floors-110 own table (the dropped possessive)

```
before: git grep -n -e 'floors-110` own' origin/main -- src
src/data/species/overgrowth.ts:2:// 29) -- Biome 1's real roster, against `content/overgrowth.md#the-overgrowth-biome-1-floors-110` own table, built
after:  git grep -n --untracked -e 'floors-110` own' -- src
```

### the file name after an anchor (sorcerer.md), two lines

```
before: git grep -n -e 'starter-glyphmoth-seer` / sorcerer' origin/main -- src
src/data/species/starters.ts:38:// chance on-turn-end to cast a random equipped spell" (`specializations/sorcerer.md#starter-glyphmoth-seer` / sorcerer.md). Its
src/data/traits/starters.ts:10:// chance on-turn-end to cast a random equipped spell" (`specializations/sorcerer.md#starter-glyphmoth-seer` / sorcerer.md).
after:  git grep -n --untracked -e 'starter-glyphmoth-seer` / sorcerer' -- src
```

### the echoed label after content/overgrowth.md#swarmhive-striker

```
before: git grep -n -e 'swarmhive-striker` Swarmhive' origin/main -- src
src/engine/effect-types.ts:328:// reads a live board count", `content/overgrowth.md#swarmhive-striker` Swarmhive Striker). Deliberately NOT wired
after:  git grep -n --untracked -e 'swarmhive-striker` Swarmhive' -- src
```

### spec/responses.md#perform-action B2 rule 2 (the old rule numbers)

```
before: git grep -n -e 'perform-action` B2' origin/main -- src
src/engine/resolution-types.ts:97:   * (`spec/responses.md#perform-action` B2 rule 2). */
after:  git grep -n --untracked -e 'perform-action` B2' -- src
```

### the ASSUMPTION (Slice F) blocks in data/species/starters.ts

```
before: git grep -n -e 'ASSUMPTION (Slice F)' origin/main -- src
src/data/species/starters.ts:11:// ASSUMPTION (Slice F): each starter/Unicorn's own species is stubbed (`spec/progression.md#starter-species-are-stubs`: "for
src/data/species/starters.ts:18:// ASSUMPTION (Slice F): exact base stats (10-30 per `spec/creatures.md#core-stats`) are parked balance, picked only
after:  git grep -n --untracked -e 'ASSUMPTION (Slice F)' -- src
```

### the corpus header's echoed label, fixture and renderFixture template

```
before: git grep -n -e 'corpus-digest`, corpus digest' origin/main -- src
src/engine/__corpus__/corpus-digest.fixture.ts:3:// fight (`CONVENTIONS.md#corpus-digest`, corpus digest).
after:  git grep -n --untracked -e 'corpus-digest`, corpus digest' -- src
```

### two more dropped possessives found while reading (`...` own)

```
before: git grep -n -e '#[a-z0-9-]*` own' origin/main -- src
src/data/species/glimmerdark.ts:2:// -- Biome 2's real roster, against `content/glimmerdark.md#glimmerdark-biome-2-floors-1120` own table, built
src/data/species/glimmerdark.ts:13:// consistent. `content/glimmerdark.md#affinity-spread` own "Coverage" note for this biome: "Vitality absent at species
src/data/species/overgrowth.ts:2:// 29) -- Biome 1's real roster, against `content/overgrowth.md#the-overgrowth-biome-1-floors-110` own table, built
src/data/species/overgrowth.ts:7:// Six species x three creatures each (18 total), following `content/overgrowth.md#enabler-payoff-amplifier` own "roles ...
src/data/species/overgrowth.ts:19:// `spec/creatures.md#affinity` own "Coverage" note: "balance at creature-stamping (affinity is
src/data/species/rotcap-hollow.ts:2:// 29) -- Biome 3's real roster, against `content/rotcap-hollow.md#rotcap-hollow-biome-3-floors-2130` own table, built
src/data/species/rotcap-hollow.ts:8:// Six species x three creatures each (18 total), following `content/rotcap-hollow.md#species-roles` own "roles ...
src/data/spells/glimmerdark.ts:11: * ally open the next round, per `spec/run.md#the-onboarding-ramp` own "a spell may apply any status, including
src/data/spells/glimmerdark.ts:41: * `spec/run.md#the-onboarding-ramp` own "a spell may apply any status, including another species' signature
src/data/statuses.ts:230: * harmful offensive action (`content/rotcap-hollow.md#confusion` own "3-turn default ... 50% chance it strikes
src/data/traits/glimmerdark.ts:132: * (`content/glimmerdark.md#blindclaws-striker` own wording is Attack-specific; the gems it casts when Pacified get no
src/data/traits/overgrowth.ts:92: * shape for this exact species (`spec/effects.md#count-scaling` own Phase 4 addenda names Swarmhive Striker as
src/data/traits/rotcap-hollow.ts:12:// scope/strength by rarity (`content/rotcap-hollow.md#myconet-endurancewit-death-network` own "heal/buff scaling off dead-ally count" is a
src/data/traits/rotcap-hollow.ts:344: * deliberately no spread mechanic on the status itself (unlike Spore), per `content/rotcap-hollow.md#sporch-violencewit-strong-non-spreading-burn` own
src/data/traits/starters.ts:56:// every Provoke, so repeated provokes stack (`specializations/shieldbarer.md#starter-stonehorn-warden` own "ramping team-Defence
src/engine/__golden__/golden-spore-spread-fizzle.fixture.ts:2:// is already Spored -- `content/rotcap-hollow.md#spore` own "fizzles if none [qualify]" loop-guard. The
after:  git grep -n --untracked -e '#[a-z0-9-]*` own' -- src
```

### The two // ASSUMPTION: markers

src/data/spells/index.test.ts (checked against `dedupKey`, `statusOnlyIds` and `scaledStat` in that file):

```
before (lines 14-29):
// Phase 4 interstitial slice (cumulative spell unlock). This registry only exists because H2
// accidentally re-authored a near-complete Overgrowth kit under new names in Glimmerdark (9
// exact-or-near reskins, since deleted -- see data/spells/glimmerdark.ts's own header comment).
// This guard is cheap protection against the SAME mistake in H3+: two spells that are
// mechanically identical (same affinity + targetShape + effect kind + magnitude) but for their name
// and id.
//
// ASSUMPTION: the brief's own guard wording is "(affinity, targetShape, payload, factor)" --
// "factor" read as the primary effect's `spellPower`. Pre-4.1-D that field was a spell-level one
// and an unread placeholder `1` on every stat-modifier spell, which is why this simple key caught
// every REAL duplicate pair pre-deletion (every stat-modifier reskin shared the placeholder); the
// key below keeps that behaviour (an `apply-stat-modifier` primary effect keys as spellPower 1). A
// future stat-modifier spell that deliberately reuses an existing (affinity, targetShape) pair
// with a genuinely different stat/factor would produce a false-positive collision under this key;
// none exists in v1 content, so this is left as a known sharp edge rather than a speculative
// addition.

after (lines 14-24):
// This registry guard exists to prevent re-authoring a near-complete kit under new names: two
// spells that are mechanically identical (same affinity + targetShape + effect kind + magnitude)
// but for their name and id are near-duplicates (`spec/run.md#spells-unlock-cumulatively`).
//
// The key reads the primary effect (the first damage/heal/stat-modifier effect; an `apply-status`
// rider never distinguishes two spells): its payload kind, the stat it scales from and its
// `spellPower`. A stat-modifier spell has no spell-level power, so an `apply-stat-modifier`
// primary effect keys as spellPower 1, and a status-only spell keys by its status ids. A future
// stat-modifier spell that deliberately reuses an existing (affinity, targetShape) pair with a
// genuinely different stat/factor would produce a false-positive collision under this key; none
// exists in v1 content, so this is left as a known sharp edge rather than a speculative addition.
```

src/state/store.ts (checked against `spec/store.md#newgame`: "The seed is generated in `src/app`", and `src/app/newGame.ts`):

```
before (lines 104-105):
// ASSUMPTION: a fixed default so the store is constructible with zero config; a real new-game
// flow (a later phase) lets the player's save generation seed this instead.

after:
99:// A fixed default so the store is constructible with zero config; the real seed is generated in
100-// `src/app` (`spec/store.md#newgame`).
```
