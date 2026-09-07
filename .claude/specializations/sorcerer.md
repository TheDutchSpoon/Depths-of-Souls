# Specialization — Sorcerer

**Identity:** the affinity **rule-breaker** — a versatile caster who equips spells across affinities
and is rewarded for gem *diversity*, not raw power. (Contrast: Brute = raw Attack, Shieldbarer =
Defence/provoke.) All content stays reachable by every spec; a spec changes *how* you play.

**Starter:** Wit affinity, high Intelligence. Trait: grants one spell as a permanent extra gem +
50% chance on-turn-end to cast a random equipped spell.

**Perk rules (locked, Grill 1):** perks are effect-framework effect-carriers, **combat-only**; flat
pool (no prerequisites); pour points freely; spec valid iff Σ(maxLevel × costPerLevel) === **1000**;
points earned = bossesCleared × 100; refund free/unlimited.

## Perks (12 — sums to 1000)

| Perk | Max lvl | Cost/lvl | Total | Effect | Phase |
|---|--:|--:|--:|---|---|
| **Echo** | 1 | 100 | 100 | Your creatures Cast spells an additional time. | P4 ✓ |
| **Wit Mastery** | 1 | 60 | 60 | Your creatures can equip Wit spell gems regardless of affinity. | P8 |
| **Violence Mastery** | 1 | 60 | 60 | Equip Violence gems regardless of affinity. | P8 |
| **Endurance Mastery** | 1 | 60 | 60 | Equip Endurance gems regardless of affinity. | P8 |
| **Vitality Mastery** | 1 | 60 | 60 | Equip Vitality gems regardless of affinity. | P8 |
| **Instinct Mastery** | 1 | 60 | 60 | Equip Instinct gems regardless of affinity. | P8 |
| **Clear Mind** | 1 | 100 | 100 | Your creatures are immune to the *effect* of Silenced (see note). | P4 ✓ |
| **Arcane Might** | 50 | 2 | 100 | +1% Intelligence per level. | P4 ✓ |
| **Arcane Shields** | 10 | 10 | 100 | −1% damage taken per level (cap 80%) for each equipped gem **not** of the creature's affinity. | P8 |
| **Arcane Versatility** | 10 | 10 | 100 | +1% damage per level for each equipped gem **not** of the creature's affinity. | P8 |
| **True Wit** | 5 | 20 | 100 | +1 spell gem slot per level. | P8 |
| **Spell Focus** | 100 | 1 | 100 | +1% spell damage per level. | P4 ✓ |
| | | | **1000** | | |

## Phase notes
The Sorcerer is **gem-centric**, and the gem-equip economy is **Phase 8** — so the Mastery /
Shields / Versatility / True Wit perks (~600 pts) are **inert until Phase 8** (nothing to equip in
the seed; player equipping + off-affinity exception both arrive with the gem economy — consistent
with §13's post-beta deferral). The **Phase-4-functional** subset (Echo, Arcane Might, Spell Focus,
Clear Mind — ~400 pts) is what the seed Sorcerer's earned points (≤300 from 3 bosses) actually buy.
Accepted trade-off: the Sorcerer **blooms at Phase 8**; in the seed it's a one-caster-plus-boosts
spec, thinner than Brute/Shieldbarer by nature. No Phase-8 scope pulled forward.

## New mechanics this spec introduces (for the Phase-4 manifest)
- **Silenced** — condition-status that **suppresses the Cast action only** (scoped suppress-action,
  vs Stun's suppress-all). Applied by a **Violence spell** in the seed pool. Intrinsic effect = the
  cast-lock.
- **Status-effect immunity (Clear Mind)** — immunity **suppresses the status's *effect*, not its
  application**: the status still lands and still counts for any "target is X" payoffs; the immune
  creature just ignores what it does. **General principle** for all future immunities. (So a
  Clear-Mind creature still *reads* as Silenced — can take "+damage to Silenced" — but casts freely.)
