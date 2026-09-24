# Depths of Souls — Locked Species (design reference)

Living overview of the species locked in during design grills. **A species = a creature
*family* unified by one closed, within-species mechanic** (single-condition, no cross-species
combos in biomes 1–3); its creatures play *roles* in that mechanic (enabler / payoff /
amplifier). Rarity governs spawn-frequency + soul-gain only, **not** power. This file is a
tracking overview — the canonical version lands in `.claude/GAME_DESIGN.md` (or a
`.claude/species/` catalog referenced from §5) at the Grill-2 doc-sync; exact creatures, stats,
names and counts are stamped as data later.

Target per biome: **≥6 species × ≥3 creatures**, biome affinity-complete, species biome-exclusive.

**Design principle (locked):** *every status has an intrinsic effect — no inert markers.* A status
must **do** something on its own; it *may additionally* be a payoff hook a species exploits.

**Closed-mechanic scope (clarified — spells excepted):** the "closed / no cross-species combos in
biomes 1–3" rule governs a **species' own trait kit** (each species is a self-contained
trap→exploit). It does **not** restrict the shared **spell pool**: a spell may apply any status,
including another species' signature one (a Wit spell applying Web or Sleep is fine). Statuses are
shared primitives, so a "+% / bonus vs enemies currently [Webbed/Sleeping]" amplifier may be
authored **inert-without-a-source** — that source can be a species-mate *or* a spell, present or
not in a given fight. Deferred to biome 4+ are cross-species *trait*-chains, not spell-supplied
statuses.

**Death-reset rule (locked):** on death, a creature's accumulated buffs, debuffs, statuses, and
stat-mods are **wiped** — if revived, it returns at **battle-start baseline** (no ramp preserved).
Makes death meaningful and revive a second chance, not a buff-preserving undo. Applies to all deaths.

---

## Biome 1 — The Overgrowth
*Mood (design filter): lush, sunlit entrance — roots, vines, thorns, pollen; alive and familiar.*

| Species | Affinity lean | Closed mechanic | Roles (illustrative) | Uses |
|---|---|---|---|---|
| **Spiders** | Wit | Trap → exploit | Weaver (`on-turn-start → apply Web to a random enemy`), Ambusher (`+% dmg to Webbed`), Broodwarden (bonus hit scaling with Webbed-enemy count) | **Web** status (break-free: Slice E2) · Ambusher exploit needs target-conditional damage (Slice E2) |
| **Swarmhive** | Violence | Strength in numbers | Drone (cheap body), Striker (scales per hive-mate **in the team**), Queen (anchor, scales hardest) | **Count-scaling** · needs `speciesId` wired + stat-modifier `magnitudeSource` (Slice E2) |
| **Treants** | Vitality / Endurance | Health engine (grows over time) | Sapling (`on-round-end → permanent +max-HP / Regen`), Elder (huge sustained wall — heals the line / scales off own max HP) | — |
| **Pollinators** | Wit / Vitality | Team-buff engine (non-health buffs) | Duster (spreads permanent non-health stat-buffs — Speed/Attack/etc.), Beneficiary (capitalizes on a buffed team) | Count-scaling (reuse) |
| **Snapjaws** | Violence / Endurance | Bait & punish (carnivorous plants) | Lure (`on-provoke → grant self defending`, pulls aggro + tanks), Jaws (`on-damage-taken → big retaliate`) | Grant-action-state; retaliate |
| **Lullpollen** | Wit / Instinct | Sleep & punish (sleep-flowers) | Sleeper (`on-attack → Sleep`, chance), Reaper (`+% dmg to Sleeping`) | **Sleep** status (self-removal: Slice E2) · Sleeper needs chance-response + Reaper needs target-conditional damage (Slice E2) |

**New this biome:**
- **Web** — the webbed creature is stuck at the **bottom of the timeline (acts last)** until it
  breaks free: **10% break-free roll at the start of every creature's turn** (~72% free within one
  round — intentionally fragile), **3-turn cap** as a bad-luck backstop. Reuses the **turn-order
  primitive** (Web = act-last; Blindclaws = act-first — same tool, opposite pole). Deliberately a
  *light* base status because Spiders' "+% to Webbed" payoff rides on it; the reward is the exploit,
  not the status.
- **Sleep** — condition-status: suppress-action like Stun, **breaks the instant the target takes
  damage** (the waking hit still lands its "vs Sleeping" bonus, then wakes); DoT wakes it; AOE wakes
  the whole team it hits; **default 3 turns** if never struck. Single-punish tool, anti-synergistic
  with your own DoT/AOE by design.
- **Count-scaling** (systems primitive) — a stat/damage-modifier whose factor reads a **live board
  count** (living allies, allies of a species/affinity, enemies with a status, …), recomputed each
  read. Swarmhive is its first user; recurs broadly.

**Coverage:** leans skew Wit / Violence / Vitality; Endurance & Instinct thin at lean level — balance
at creature-stamping (affinity is per-creature).

---

## Biome 2 — Glimmerdark
*Mood (design filter): light thins, life adapts — pale growth, cave-dwellers, bioluminescence.*

| Species | Affinity lean | Closed mechanic | Roles (illustrative) | Uses |
|---|---|---|---|---|
| **Glowflies** | Wit / Instinct | Charge & release | Charger (`stacks Glow on an ally`), Detonator (`consume all Glow → burst`) | **Glow** status + consume-response |
| **Blindclaws** | Instinct | Ambush via turn order | Setter (`grant act-first` to an ally), Striker (`+% while acting before its target`) | **Turn-order status** + acted-before condition |
| **Resonants** | Wit | Caster synergy | Chorus/Adept `on-ally-action (cast) → gain Attack / Int`; **Overtone** (rare payoff) `on-ally-action (cast) → 10% the caster echo-casts a random one of its own spells` (non-stacking; echoes are themselves observable) | `on-action-observed` (built) + **echo-cast via the bonus-cast pattern** (H2 — a `combat.ts` mechanism like the Sorcerer's bonus-cast, **not** a new response verb; nine holds), bounded by threading the ambient cascade — see CONVENTIONS |
| **Sparkeaters** | Violence / Endurance / Vitality (each drainer's affinity = the stat it steals, per CLAUDE.md soft-mapping) | Stat-parasites | Leech (`on-attack → −Attack enemy + same +Attack self`, Violence), Gorger (same shape on Defence, Endurance), **Voidmaw** (rare, Vitality — genuinely distinct: `on-attack → steal max-HP from target + feed that max-HP to the WHOLE team`, apex parasite) | ~free (apply-stat-modifier pairs; Voidmaw uses the `health` stat + `all-allies`, precedent: Treant Grovekeep) |
| **Gloomjaws** | Violence | Execute the weak (three DISTINCT verbs, not one shared mechanic ×3 numbers) | Stalker (`conditional-damage-bonus` +% vs low-HP — the finisher), Executioner (`on-kill → permanent +Attack self` — snowballs off finishing blows), Ravager (`armor-penetration` — softens healthy targets *into* execute range) | all free/built (conditional-damage-bonus, `on-kill`, armor-penetration all exist post-E2); intra-species synergy: Ravager softens → Stalker executes → Executioner snowballs |
| **Shellbacks** | Endurance | Armor-as-weapon | Builders (`stack permanent +Defence on allies`), attacker uses `stat-remap` Defence→Attack | free (stat-remap + existing) |

**New this biome:**
- **Glow** — stacking *resource* status on an ally, with intrinsic effect: **+% damage dealt per
  stack** while held (charging up); the Detonator's **consume-all-stacks → burst** is the payoff.
  A new primitive class: *accumulate-and-spend resource* (distinct from Web/Sleep markers and from
  count-scaling's live-board read). Needs a **consume-stacks response** (read count → effect → clear).
- **Turn-order status** — timed status forcing the target to act **first or last** for N turns; a
  genuine **two-way primitive** now used by both Blindclaws (act-first) and Web (act-last). Needs the
  turn-order step to read it (position override; precedent: Stun suppresses a turn). Intrinsic effect
  = the position change itself. Edge-cases for the coding agent: act-first + act-last on one creature
  (tiebreak), and ordering among multiple same-pole creatures (by Speed).
- **acted-before-target condition** — condition predicate: "this creature is acting before its
  target has acted this round" (Blindclaws' Striker payoff). Consumed as a **passive
  `conditional-damage-bonus`** (+% damage while acting before the target): the Slice-C condition is
  **completed in H2** to read the current damage target (`resolvingAgainst`) when there is no
  scripting-rule context, so Striker is a numeric TRAIT — never a bespoke script (action-selection
  is the scripting layer's job, not a creature-identity trait).

**Coverage:** leans Wit ×2 / Instinct ×2 / Violence ×2 / Endurance ×2 / Vitality ×1 (Sparkeaters now
span Violence/Endurance/Vitality via the stat-aligned drainer affinities, so Vitality is carried at
species level by Voidmaw; Glowfly Radiant remains the extra sprinkle). *(Superseded: earlier this read
"Vitality absent at species level — resolved by sprinkling Vitality creatures in at stamping"; the
stat-aligned Sparkeater affinities now carry Vitality at species level directly.)*

---

## Starter species (stubbed — rosters deferred)
Each spec's starter belongs to a species found only in a **deep biome**, authored later; for now
only the starter creature exists (species sits below the ≥3-creature minimum on purpose).

- **Sorcerer starter** — **Wit** affinity, high Intelligence. Trait: grants one spell as a
  permanent extra gem + 50% on-turn-end to cast a random equipped spell. The "permanent extra
  gem" is a **fixed equipped-spell loadout carried on the starter's own data** (its granted Wit
  gem sits in slot 0 of a 4-slot loadout — one more than the default 3; slots 1–3 are
  player-equippable in Phase 8), materialized through the same path as any creature's loadout —
  distinct from the generator rolling *enemy* spells from a biome pool.
- **Brute starter** — **Violence** affinity, high Attack. Trait: **Attack resolves one additional instance** (Attack executes twice at 100% — each a *real attack* firing `on-attack`; same target as the first, default-target fallback if it died). An **instance-list** modifier, not an on-attack trigger.
- **Shieldbarer starter** — **Endurance** affinity, high Defence. Trait: `on-provoke → your creatures gain +35% Defence` (team-wide; permanent-for-fight, so repeated provokes stack). *(The old `on-provoke → grant self defending` trait became the Shieldbarer's **Shield up** perk.)*

*(Starter affinities **ratified** (grill follow-up, PR #56 review): Sorcerer = **Wit**, Brute =
**Violence**, Shieldbarer = **Endurance**, Unicorn = **Vitality** — four distinct, each matching
its "high stat" via CLAUDE.md's affinity→stat soft-mapping. The starters' own species stay stubbed;
the affinities are now pinned regardless.)*

**The Unicorn (intro helper — unique, permanent).** A rigged **scripted intro encounter** before
floor 1: you attack the Unicorn, (intend to) lose, and it **revives your starter and joins your
party** — you begin floor 1 with two creatures vs a 1-enemy team (gentle start). It **joins
win-or-lose** (the "meant to lose" is narrative, not enforced). Un-parks the §13 entrance-prelude.
- **Trait:** *Whenever this creature attacks, it resurrects a random dead ally at 20% of its
  baseline max HP.* Fires **per attack hit** (so multi-attack — Flurry etc. — revives multiple
  times; safe because revive deals no damage, so no cascade).
- Unique creature; its **Unicorn species is stubbed** (returns in a later biome with a real roster),
  like the starters. Permanent party member.
- Opens **sacrifice-revive** as a design space for future specs.

---

## Biome 3 — Rotcap Hollow
*Mood (design filter): fungal — colonies, spores, decay, carrion, parasites; spread.*

| Species | Affinity lean | Closed mechanic | Roles (illustrative) | Uses |
|---|---|---|---|---|
| **Sporecloud** | Wit | Contagion | Seeder (`on-attack → Spore`), Reaper (`+% / count-scaling per Spored enemy`) | **Spore** status |
| **Rotfeeders** | Violence | Carrion snowball | `on-enemy-death → permanent +Attack`; `on-kill → heal self` | heal response |
| **Myconet** | Endurance | Death-network | `on-ally-death → survivors +Defence`; `on-death → Poison all-enemies` | free (`all-enemies` exists) |
| **Necromoss** | Wit / Vitality | Reclaim (grim sustain) | heal/buff **scaling off dead-ally count**: heals read the live dead-ally count each firing; the buff is a flat rise **per ally death** (each death counted once — never a count on a per-death trigger, see CONVENTIONS) | count-scaling + heal |
| **Hollowkin** | Endurance / Instinct | Puppet | one applies **Confusion** `on-damage-taken`, one `on-attack` | **Confusion** status |
| **Sporch** | Violence / Wit | Strong non-spreading Burn | Igniter (potent Burn — data, no spread), Reaper (`+% to Burning`), Cinderlord (`on-kill → 1 Burn stack on every enemy` — a creature-level kill-burst, exactly 1 stack; the Burn *status* never spreads) | Burn exists, but `+% to Burning` **needs target-conditional damage-modifier (Slice E2)** — *not free* |

**New this biome:**
- **Spore** — a DoT condition-status that, `on-death` of its host, **spreads to one random
  living, non-Spored creature on the host's own side** (loop-guarded: fizzles if none). The rule
  is **host-relative** whoever applied it (Sporecloud, a spell, Confused friendly fire, the Rot
  Sovereign) — "enemy" in earlier drafts meant "the Sporecloud's enemy," i.e. the infected
  population. The spread is a trigger on the status itself and fires however the host dies,
  including from Spore's own tick. Intrinsic effect = the DoT; Sporecloud's payoff reads
  Spored-enemy count via count-scaling. *(Ratified PR #64 review; built H3 via one new
  `ResponseTarget`, `random-ally-without-status`.)*
- **Confusion** — condition-status, **3-turn default**: each turn the confused creature takes a
  **harmful action** (attack / harmful cast), **50% chance it strikes its own side** instead
  (friendly fire). Consumes combat RNG; rides the Provoke targeting-override slot. Edge-cases for the
  coding agent: confused AOE harmful action (flip whole AOE to allies?), Confused + Provoked tiebreak.
- **`heal` response (5th response type)** — cross-cutting, formalized here: restore HP to a target
  (self / ally / all-allies via existing targeting), **caps at effective max HP (no overheal)**,
  distinct from Regen (heal-over-time status). Deliberate expansion of the response vocab **4 → 5**;
  heal is the one genuinely-distinct core verb the four couldn't cover — **hold the line at five.**
  Retroactively this is how Treants, Rotfeeders, Necromoss, and support spells all heal (and it
  cleans up the support-spell addendum, where heal was mislabeled as spell-specific).

**Coverage:** all five leans present (Wit ×3 / Violence ×2 / Endurance ×2 / Instinct ×1 / Vitality ×1)
— the most affinity-complete of the three biomes.

---

## Seed bosses (floors 10 / 20 / 30 — one per biome)

Unique, non-collectable, non-spawnable **set-pieces** via the fixed-authored-encounter path;
boss-only floor (no trash); first clear = **100 perk points** (tracked by boss id). Each = an
elevated `Instance` + signature trait(s) + **adds drawn from the biome's spawn pool**. Bosses are
**exempt from the roster trait-ceiling** (they're set-pieces, not species) but each seed boss keeps
**one clear signature** for legibility. Deliberately shaped to play *differently* (not three
race-fights). **Zero new engine cost — all recombinations of already-locked primitives.**

| Boss | Floor / biome | Fight shape | Signature (locked primitives) |
|---|---|---|---|
| **Broodmother** *(giant spider)* | 10 — The Overgrowth | Target-priority | **Count-scales** off living spiderling adds + periodically **Webs** the party (act-last). Kill adds to weaken her. Adds: spiderlings (Spider pool). |
| **Leech Sovereign** | 20 — Glimmerdark | Fast steal-race | Every hit **steals a stat** (permanent −you / +it, same as Sparkeaters); you hollow out over time — answer is raw burst. Lean identity (no heavy add layer). |
| **Rot Sovereign** | 30 — Rotcap Hollow | Attrition-management (finale) | Grows with **every death**: a flat, permanent Attack rise **per death, the same rate whichever side died** (her adds or your creatures — any creature that dies feeds it; each death counted once) + blankets the party in spreading **Spore**. Puzzle = don't-feed-it + out-manage the rot, not pure DPS. |

Power seam: elevated **level** (a few above the floor's range, via the curve) + signature traits +
adds. Exact stats/numbers are parked balance.

## Cumulative new mechanics (for the Phase-4 systems manifest)
- **Response vocab 4 → 8:** add **`heal`** (restore HP to a living target; caps at max; no
  overheal; distinct from Regen), **`revive`** (return a *dead* creature at baseline + % HP — see
  death-reset rule), and — already-present-but-now-counted — **`grant-action-state`** and
  **`consume-stacks`**. Eight top-level response kinds at seed-content lock. *(Slice E2 later
  added a ninth, **`remove-status`**; the line is now held at nine — see CONVENTIONS "Response
  vocabulary — now NINE".)*
- **Flow:** **scripted-intro encounter** (a rigged fight with a story outcome instead of wipe→hub).
- Statuses: **Sleep** (breaks-on-damage suppress), **Glow** (stacking resource), **turn-order**
  (act first *or* last — two-way primitive; **Web** = act-last consumer + 10%/turn break-free),
  **Spore** (DoT + spread-on-death), **Confusion** (3-turn, 50%/harmful-action friendly-fire).
- Targets: **`random-ally-without-status`** `ResponseTarget` (H3, Spore's spread — a random living
  ally of the firing creature lacking a given status; the one vocabulary addition H3 needed).
- Primitives/responses: **count-scaling** modifier (reads live-board *or* dead-ally counts),
  **consume-stacks** response, **grant-action-state** response, **acted-before-target** condition,
  **targeting-override** (Provoke=narrow, Confusion=randomize-to-allies), **stat-remap** (existing,
  first roster use).
- Principle: **every status has an intrinsic effect** (no inert markers).
