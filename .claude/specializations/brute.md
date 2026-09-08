# Specialization — Brute

**Identity:** raw physical **aggression** — Attack power, on-attack triggers, and melee-splash
force. (Contrast: Sorcerer = affinity-flexible caster, Shieldbarer = Defence/provoke.) All content
stays reachable by every spec.

**Starter:** high Attack. Trait: **Attack resolves one additional instance** — Attack executes
twice at 100%, each a *real attack* firing `on-attack` (same target as the first, default-target
fallback if it died). An **instance-list** modifier (not an on-attack trigger), consistent with
Flurry.

**Perk rules:** effect-framework effect-carriers, combat-only; flat pool; spec valid iff
Σ(maxLevel × costPerLevel) === **1000**.

## Perks (10 — sums to 1000)

| Perk | Max lvl | Cost/lvl | Total | Effect | Phase |
|---|--:|--:|--:|---|---|
| **Flurry** | 1 | 100 | 100 | Your creatures Attack an additional time. | P4 ✓ |
| **Might** | 50 | 2 | 100 | +1% Attack per level. | P4 ✓ |
| **Brute Force** | 100 | 1 | 100 | +1% damage with attacks per rank. | P4 ✓ |
| **Aggressive** | 1 | 100 | 100 | Immune to the *effect* of Pacified (still applied; see note). | P4 ✓ |
| **Proficient Warrior** | 1 | 100 | 100 | Your creatures always have **Splashing** and **Proficient**. | Splashing P4 ✓ / Proficient P8 |
| **Annihilate** | 1 | 100 | 100 | Your creatures' **Splashing** now hits **all** enemies (not just adjacent). | P4 ✓ |
| **Aggressive Caster** | 25 | 4 | 100 | On cast, +1% of the caster's Attack per rank is added to the spell's damage. | P4 (conditional — works whenever a creature casts) |
| **Concussive Blows** | 25 | 4 | 100 | On attack, 1% chance per rank to Weaken the target. | P4 ✓ |
| **Cull the Weak** | 50 | 2 | 100 | +1% damage to Weakened targets per level. | P4 ✓ |
| **Tunnel Vision** | 1 | 100 | 100 | Your creatures ignore enemy **Provoke** — they choose their target freely. | P4 ✓ |
| | | | **1000** | | |

## Phase notes
Mostly **Phase-4-functional** (a far richer seed spec than Sorcerer). The only genuinely seed-inert bit is **Proficient** (scales Equipment Stat Slots — the equipment
system is P8). **Aggressive Caster** is functional whenever a creature casts — casting is
**spec-agnostic** (any spec fields casters), so it's not a Brute limitation; it's simply thin in the
seed to the same degree casting is thin for everyone. Splashing (half of Proficient Warrior) works in
the seed once adjacency is built.

## New mechanics this spec introduces (for the Phase-4 manifest)
- **Pacified** — condition-status that **suppresses the Attack action only** (scoped suppress-action;
  the mirror of Silenced). Applied by a **Wit spell** in the seed pool. Intrinsic effect = the
  attack-lock. *(Silenced ⇄ Pacified: each affinity's anti-tool against the other's core action.)*
- **Adjacency targeting** — slot-adjacency, **built now** (un-defers the biome-4+ adjacency
  deferral; Splashing is its first consumer). Edge-case for coding agent: adjacent *slots* vs
  adjacent *living creatures*.
- **Splashing** — status: attacks deal 100% of their damage to enemies **adjacent** to the target.
- **Proficient** — status (**P8**): +30% benefit from Equipment Stat Slots.
- **Annihilate** — upgrades Splashing from adjacent → **all-enemies**.
- **Aggressive Caster** — cross-stat contribution: Attack adds to a spell's damage **on top of the
  spell's own `scalingStat`** (whatever that is — Int, an affinity stat, or flat). On a flat/utility
  spell it can be the *only* damage source; it effectively turns any spell into a partial
  Attack-scaler.
- **Tunnel Vision** — **targeting-immunity**: the creature skips the enemy's Provoke redirect at
  target-selection (distinct from status-effect-immunity — Provoke is a redirect *by* the enemy, not
  a status *on* your creature).
- Reuses: immunity-suppresses-effect principle (Aggressive, like Clear Mind), Weaken, HP conditions.

## Related doc change
**artifacts → equipment** rename (artifacts are stat-focused P8 gear): find/replace across
GAME_DESIGN/CONVENTIONS/CLAUDE at the sync. "Equipment Stat Slots" (Proficient) uses the new name.
