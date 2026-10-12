# Names: the rename map

Generated from `renames.json`. Every row is old -> new, with the one line it pins.

## Files (127)

| Old | New | Importers | Pins |
| --- | --- | --- | --- |
| `__golden__/golden-b1-fallback-lowest-hp.fixture.ts` | `__golden__/golden-fallback-attacks-lowest-hp.fixture.ts` | 2 | fixture of the golden that pins: the script-less fallback attacks the lowest-HP enemy |
| `__golden__/golden-b1-fallback-lowest-hp.test.ts` | `__golden__/golden-fallback-attacks-lowest-hp.test.ts` | 0 | golden that pins: the script-less fallback attacks the lowest-HP enemy |
| `__golden__/golden-b1-granted-cast-default.fixture.ts` | `__golden__/golden-granted-cast-default-lowest-hp.fixture.ts` | 2 | fixture of the golden that pins: a granted cast defaults to the lowest-HP enemy |
| `__golden__/golden-b1-granted-cast-default.test.ts` | `__golden__/golden-granted-cast-default-lowest-hp.test.ts` | 0 | golden that pins: a granted cast defaults to the lowest-HP enemy |
| `__golden__/golden-b1-support-heals-own-side.fixture.ts` | `__golden__/golden-support-heals-own-lowest-hp-ally.fixture.ts` | 2 | fixture of the golden that pins: an enemy support caster under always-cast heals its own lowest-HP ally |
| `__golden__/golden-b1-support-heals-own-side.test.ts` | `__golden__/golden-support-heals-own-lowest-hp-ally.test.ts` | 0 | golden that pins: an enemy support caster under always-cast heals its own lowest-HP ally |
| `__golden__/golden-b2-confused-granted-cast-redirects.fixture.ts` | `__golden__/golden-granted-cast-confused-redirects.fixture.ts` | 2 | fixture of the golden that pins: a confused caster's granted cast can redirect onto an ally |
| `__golden__/golden-b2-confused-granted-cast-redirects.test.ts` | `__golden__/golden-granted-cast-confused-redirects.test.ts` | 0 | golden that pins: a confused caster's granted cast can redirect onto an ally |
| `__golden__/golden-b2-provoke-redirects-echo.fixture.ts` | `__golden__/golden-echo-provoke-redirects.fixture.ts` | 2 | fixture of the golden that pins: a Provoke redirects an echo, once, onto the provoker |
| `__golden__/golden-b2-provoke-redirects-echo.test.ts` | `__golden__/golden-echo-provoke-redirects.test.ts` | 0 | golden that pins: a Provoke redirects an echo, once, onto the provoker |
| `__golden__/golden-b2-silenced-refuses-granted-cast.fixture.ts` | `__golden__/golden-granted-cast-refused-by-fixture-lock.fixture.ts` | 2 | fixture of the golden that pins: a trait-borne fixture lock refuses a granted cast and draws nothing |
| `__golden__/golden-b2-silenced-refuses-granted-cast.test.ts` | `__golden__/golden-granted-cast-refused-by-fixture-lock.test.ts` | 0 | golden that pins: a trait-borne fixture lock refuses a granted cast and draws nothing |
| `__golden__/golden-f3-silenced-refuses-granted-cast.fixture.ts` | `__golden__/golden-granted-cast-refused-by-silenced-status.fixture.ts` | 2 | fixture of the golden that pins: the real Silenced status from the real Silence spell refuses a granted cast (the real-status mirror of the fixture-lock golden) |
| `__golden__/golden-f3-silenced-refuses-granted-cast.test.ts` | `__golden__/golden-granted-cast-refused-by-silenced-status.test.ts` | 0 | golden that pins: the real Silenced status from the real Silence spell refuses a granted cast (the real-status mirror of the fixture-lock golden) |
| `__golden__/golden-b2-skipped-turn-refuses-granted-cast.fixture.ts` | `__golden__/golden-granted-cast-refused-on-skipped-turn.fixture.ts` | 2 | fixture of the golden that pins: a skipped turn refuses the granted cast, after rolling |
| `__golden__/golden-b2-skipped-turn-refuses-granted-cast.test.ts` | `__golden__/golden-granted-cast-refused-on-skipped-turn.test.ts` | 0 | golden that pins: a skipped turn refuses the granted cast, after rolling |
| `__golden__/golden-b4-cleanse-then-tick.fixture.ts` | `__golden__/golden-exact-instance-cleanse-then-tick.fixture.ts` | 2 | fixture of the golden that pins: exact-instance rule: cleanse, then tick |
| `__golden__/golden-b4-cleanse-then-tick.test.ts` | `__golden__/golden-exact-instance-cleanse-then-tick.test.ts` | 0 | golden that pins: exact-instance rule: cleanse, then tick |
| `__golden__/golden-b4-remove-then-reapply.fixture.ts` | `__golden__/golden-exact-instance-remove-then-reapply.fixture.ts` | 2 | fixture of the golden that pins: exact-instance rule: remove, then reapply |
| `__golden__/golden-b4-remove-then-reapply.test.ts` | `__golden__/golden-exact-instance-remove-then-reapply.test.ts` | 0 | golden that pins: exact-instance rule: remove, then reapply |
| `__golden__/golden-b5-cast-fizzle.fixture.ts` | `__golden__/golden-fizzle-retarget-cast.fixture.ts` | 2 | fixture of the golden that pins: pre-hit-hook fizzle on the Cast path, then the rule-4 re-target |
| `__golden__/golden-b5-cast-fizzle.test.ts` | `__golden__/golden-fizzle-retarget-cast.test.ts` | 0 | golden that pins: pre-hit-hook fizzle on the Cast path, then the rule-4 re-target |
| `__golden__/golden-b5-fizzle-rule4-retarget.fixture.ts` | `__golden__/golden-fizzle-retarget-attack.fixture.ts` | 2 | fixture of the golden that pins: pre-hit-hook fizzle on the Attack path, then the rule-4 re-target |
| `__golden__/golden-b5-fizzle-rule4-retarget.test.ts` | `__golden__/golden-fizzle-retarget-attack.test.ts` | 0 | golden that pins: pre-hit-hook fizzle on the Attack path, then the rule-4 re-target |
| `__golden__/golden-b6-provoke-stun-cleanup.fixture.ts` | `__golden__/golden-provoke-stun-cleanup.fixture.ts` | 2 | fixture of the golden that pins: a provoker Stunned before its next turn stops provoking at that turn start |
| `__golden__/golden-b6-provoke-stun-cleanup.test.ts` | `__golden__/golden-provoke-stun-cleanup.test.ts` | 0 | golden that pins: a provoker Stunned before its next turn stops provoking at that turn start |
| `__golden__/golden-d3-revive-cap-exclusion.fixture.ts` | `__golden__/golden-revive-cap-exclusion.fixture.ts` | 2 | fixture of the golden that pins: revive cap: a capped dead ally is excluded from the pool |
| `__golden__/golden-d3-revive-cap-exclusion.test.ts` | `__golden__/golden-revive-cap-exclusion.test.ts` | 0 | golden that pins: revive cap: a capped dead ally is excluded from the pool |
| `__golden__/golden-d3-revive-cap-fizzle.fixture.ts` | `__golden__/golden-revive-cap-fizzle.fixture.ts` | 2 | fixture of the golden that pins: revive cap: the 11th attempt fizzles and draws nothing |
| `__golden__/golden-d3-revive-cap-fizzle.test.ts` | `__golden__/golden-revive-cap-fizzle.test.ts` | 0 | golden that pins: revive cap: the 11th attempt fizzles and draws nothing |
| `__golden__/golden-e-echo-chain-truncated.fixture.ts` | `__golden__/golden-echo-chain-truncated.fixture.ts` | 2 | fixture of the golden that pins: an echo chain through the same Overtone, truncated at the real cap |
| `__golden__/golden-e-echo-chain-truncated.test.ts` | `__golden__/golden-echo-chain-truncated.test.ts` | 0 | golden that pins: an echo chain through the same Overtone, truncated at the real cap |
| `__golden__/golden-e-grant-actor-dies-first.fixture.ts` | `__golden__/golden-grant-actor-dies-first.fixture.ts` | 2 | fixture of the golden that pins: a queued grant whose actor died first emits nothing |
| `__golden__/golden-e-grant-actor-dies-first.test.ts` | `__golden__/golden-grant-actor-dies-first.test.ts` | 0 | golden that pins: a queued grant whose actor died first emits nothing |
| `__golden__/golden-e-grant-during-granted-action.fixture.ts` | `__golden__/golden-grant-during-granted-action.fixture.ts` | 2 | fixture of the golden that pins: a grant raised during a granted action queues FIFO |
| `__golden__/golden-e-grant-during-granted-action.test.ts` | `__golden__/golden-grant-during-granted-action.test.ts` | 0 | golden that pins: a grant raised during a granted action queues FIFO |
| `__golden__/golden-f2-dot-one-turn.fixture.ts` | `__golden__/golden-status-timing-dot-one-turn.fixture.ts` | 2 | fixture of the golden that pins: a 1-turn DoT ticks once; a self-applied one is born and ticks next turn |
| `__golden__/golden-f2-dot-one-turn.test.ts` | `__golden__/golden-status-timing-dot-one-turn.test.ts` | 0 | golden that pins: a 1-turn DoT ticks once; a self-applied one is born and ticks next turn |
| `__golden__/golden-f2-stun-one-turn.fixture.ts` | `__golden__/golden-status-timing-stun-one-turn.fixture.ts` | 2 | fixture of the golden that pins: Stun 1 skips exactly one turn, applied before or after the applier in the queue |
| `__golden__/golden-f2-stun-one-turn.test.ts` | `__golden__/golden-status-timing-stun-one-turn.test.ts` | 0 | golden that pins: Stun 1 skips exactly one turn, applied before or after the applier in the queue |
| `__golden__/golden-f2-turn-end-interaction.fixture.ts` | `__golden__/golden-status-timing-turn-end-interaction.fixture.ts` | 2 | fixture of the golden that pins: a tick-kill spreads on-death, the spread follows the born rule, a tick-kill wins the fight |
| `__golden__/golden-f2-turn-end-interaction.test.ts` | `__golden__/golden-status-timing-turn-end-interaction.test.ts` | 0 | golden that pins: a tick-kill spreads on-death, the spread follows the born rule, a tick-kill wins the fight |
| `__golden__/golden-f2-turnstart-self-stun-once.fixture.ts` | `__golden__/golden-status-timing-turnstart-self-stun-once.fixture.ts` | 2 | fixture of the golden that pins: a Stun 1 gained in the own turn-start hooks skips exactly one turn |
| `__golden__/golden-f2-turnstart-self-stun-once.test.ts` | `__golden__/golden-status-timing-turnstart-self-stun-once.test.ts` | 0 | golden that pins: a Stun 1 gained in the own turn-start hooks skips exactly one turn |
| `__golden__/golden-f2-weaken-three-turns.fixture.ts` | `__golden__/golden-status-timing-weaken-three-turns.fixture.ts` | 2 | fixture of the golden that pins: a 3-turn Weaken covers the next three bearer turns |
| `__golden__/golden-f2-weaken-three-turns.test.ts` | `__golden__/golden-status-timing-weaken-three-turns.test.ts` | 0 | golden that pins: a 3-turn Weaken covers the next three bearer turns |
| `__golden__/golden-f2-web-turn-end-roll.fixture.ts` | `__golden__/golden-status-timing-web-turn-end-roll.fixture.ts` | 2 | fixture of the golden that pins: the Web roll is in turn-end cleanup and skips a Web applied this turn |
| `__golden__/golden-f2-web-turn-end-roll.test.ts` | `__golden__/golden-status-timing-web-turn-end-roll.test.ts` | 0 | golden that pins: the Web roll is in turn-end cleanup and skips a Web applied this turn |
| `__golden__/golden-f2-win-over-own-tick.fixture.ts` | `__golden__/golden-status-timing-win-over-own-tick.fixture.ts` | 2 | fixture of the golden that pins: the last survivor empties the enemy side and wins over its own tick |
| `__golden__/golden-f2-win-over-own-tick.test.ts` | `__golden__/golden-status-timing-win-over-own-tick.test.ts` | 0 | golden that pins: the last survivor empties the enemy side and wins over its own tick |
| `__golden__/golden-f3-fight-start-wipe.fixture.ts` | `__golden__/golden-fight-start-wipe.fixture.ts` | 2 | fixture of the golden that pins: a fight-start wipe ends the fight before RoundStarted |
| `__golden__/golden-f3-fight-start-wipe.test.ts` | `__golden__/golden-fight-start-wipe.test.ts` | 0 | golden that pins: a fight-start wipe ends the fight before RoundStarted |
| `__golden__/golden-f3-immunity.fixture.ts` | `__golden__/golden-lock-immunity.fixture.ts` | 2 | fixture of the golden that pins: Clear Mind and Aggressive let the locked action through while the status lands |
| `__golden__/golden-f3-immunity.test.ts` | `__golden__/golden-lock-immunity.test.ts` | 0 | golden that pins: Clear Mind and Aggressive let the locked action through while the status lands |
| `__golden__/golden-f3-pacify-three-turns.fixture.ts` | `__golden__/golden-pacify-three-turns.fixture.ts` | 2 | fixture of the golden that pins: Pacify locks its target's Attack for its next three own turns |
| `__golden__/golden-f3-pacify-three-turns.test.ts` | `__golden__/golden-pacify-three-turns.test.ts` | 0 | golden that pins: Pacify locks its target's Attack for its next three own turns |
| `__golden__/golden-f3-silence-three-turns.fixture.ts` | `__golden__/golden-silence-three-turns.fixture.ts` | 2 | fixture of the golden that pins: Silence locks its target's Cast for its next three own turns |
| `__golden__/golden-f3-silence-three-turns.test.ts` | `__golden__/golden-silence-three-turns.test.ts` | 0 | golden that pins: Silence locks its target's Cast for its next three own turns |
| `__golden__/golden-g1-leech-sovereign-pacified.fixture.ts` | `__golden__/golden-leech-sovereign-pacified.fixture.ts` | 2 | fixture of the golden that pins: a Pacified Leech Sovereign casts instead of waiting (real content) |
| `__golden__/golden-g1-leech-sovereign-pacified.test.ts` | `__golden__/golden-leech-sovereign-pacified.test.ts` | 0 | golden that pins: a Pacified Leech Sovereign casts instead of waiting (real content) |
| `__golden__/golden-h2a-additional-granted.fixture.ts` | `__golden__/golden-additional-granted.fixture.ts` | 2 | fixture of the golden that pins: a granted Attack stays direct and gets the Additional |
| `__golden__/golden-h2a-additional-granted.test.ts` | `__golden__/golden-additional-granted.test.ts` | 0 | golden that pins: a granted Attack stays direct and gets the Additional |
| `__golden__/golden-h2a-additional-hp-bound.fixture.ts` | `__golden__/golden-additional-hp-bound.fixture.ts` | 2 | fixture of the golden that pins: the Additional is bounded by 20% of the target's max Health |
| `__golden__/golden-h2a-additional-hp-bound.test.ts` | `__golden__/golden-additional-hp-bound.test.ts` | 0 | golden that pins: the Additional is bounded by 20% of the target's max Health |
| `__golden__/golden-h2a-additional-levels.fixture.ts` | `__golden__/golden-additional-levels.fixture.ts` | 2 | fixture of the golden that pins: the Additional at attacker levels 1, 8 and 11 |
| `__golden__/golden-h2a-additional-levels.test.ts` | `__golden__/golden-additional-levels.test.ts` | 0 | golden that pins: the Additional at attacker levels 1, 8 and 11 |
| `__golden__/golden-h2a-additional-second-instance.fixture.ts` | `__golden__/golden-additional-second-instance.fixture.ts` | 2 | fixture of the golden that pins: the Additional lands on the second attack instance too |
| `__golden__/golden-h2a-additional-second-instance.test.ts` | `__golden__/golden-additional-second-instance.test.ts` | 0 | golden that pins: the Additional lands on the second attack instance too |
| `__golden__/golden-h2a-additional-spell.fixture.ts` | `__golden__/golden-additional-spell.fixture.ts` | 2 | fixture of the golden that pins: the Additional lands on every direct hit of a spell |
| `__golden__/golden-h2a-additional-spell.test.ts` | `__golden__/golden-additional-spell.test.ts` | 0 | golden that pins: the Additional lands on every direct hit of a spell |
| `__golden__/golden-h2a-additional-splashing.fixture.ts` | `__golden__/golden-additional-splashing.fixture.ts` | 2 | fixture of the golden that pins: the Additional lands on every Splashing hit |
| `__golden__/golden-h2a-additional-splashing.test.ts` | `__golden__/golden-additional-splashing.test.ts` | 0 | golden that pins: the Additional lands on every Splashing hit |
| `__golden__/golden-h2a-cost.fixture.ts` | `__golden__/golden-cost-and-tick-exclusion.fixture.ts` | 2 | fixture of the golden that pins: the cost rule and the DoT-tick exclusion |
| `__golden__/golden-h2a-cost.test.ts` | `__golden__/golden-cost-and-tick-exclusion.test.ts` | 0 | golden that pins: the cost rule and the DoT-tick exclusion |
| `__golden__/golden-h2a-flat-indirect.fixture.ts` | `__golden__/golden-indirect-flat-response.fixture.ts` | 2 | fixture of the golden that pins: flat-mode response damage on another creature is indirect |
| `__golden__/golden-h2a-flat-indirect.test.ts` | `__golden__/golden-indirect-flat-response.test.ts` | 0 | golden that pins: flat-mode response damage on another creature is indirect |
| `__golden__/golden-h2a-indirect-keeps.fixture.ts` | `__golden__/golden-indirect-keeps-terms.fixture.ts` | 2 | fixture of the golden that pins: indirect damage keeps affinity, dealt, conditional, taken and penetration terms, and gets no Additional |
| `__golden__/golden-h2a-indirect-keeps.test.ts` | `__golden__/golden-indirect-keeps-terms.test.ts` | 0 | golden that pins: indirect damage keeps affinity, dealt, conditional, taken and penetration terms, and gets no Additional |
| `__golden__/golden-h2a-indirect.fixture.ts` | `__golden__/golden-indirect-trait-response.fixture.ts` | 2 | fixture of the golden that pins: a trait response is indirect damage: a fifth of Defence, Defend, no cross-stat |
| `__golden__/golden-h2a-indirect.test.ts` | `__golden__/golden-indirect-trait-response.test.ts` | 0 | golden that pins: a trait response is indirect damage: a fifth of Defence, Defend, no cross-stat |
| `__golden__/golden-h2a-spell-on-caster.fixture.ts` | `__golden__/golden-spell-on-caster-direct.fixture.ts` | 2 | fixture of the golden that pins: a spell effect on its own caster is direct damage |
| `__golden__/golden-h2a-spell-on-caster.test.ts` | `__golden__/golden-spell-on-caster-direct.test.ts` | 0 | golden that pins: a spell effect on its own caster is direct damage |
| `__golden__/golden-h2b1-last-gleam.fixture.ts` | `__golden__/golden-last-gleam.fixture.ts` | 1 | fixture of the golden that pins: an ally dying gives every living ally +20% Attack; the Last Gleam dying does not trigger itself |
| `__golden__/golden-h2b1-last-gleam.test.ts` | `__golden__/golden-last-gleam.test.ts` | 0 | golden that pins: an ally dying gives every living ally +20% Attack; the Last Gleam dying does not trigger itself |
| `__golden__/golden-h2b1-observed-cost.fixture.ts` | `__golden__/golden-damage-observed-cost.fixture.ts` | 2 | fixture of the golden that pins: damage observation of a cost |
| `__golden__/golden-h2b1-observed-cost.test.ts` | `__golden__/golden-damage-observed-cost.test.ts` | 0 | golden that pins: damage observation of a cost |
| `__golden__/golden-h2b1-observed-lethal.fixture.ts` | `__golden__/golden-damage-observed-lethal.fixture.ts` | 2 | fixture of the golden that pins: a lethal burn: the Flare reacts before CreatureDied, the Last Gleam after it |
| `__golden__/golden-h2b1-observed-lethal.test.ts` | `__golden__/golden-damage-observed-lethal.test.ts` | 0 | golden that pins: a lethal burn: the Flare reacts before CreatureDied, the Last Gleam after it |
| `__golden__/golden-h2b1-observed-silent.fixture.ts` | `__golden__/golden-damage-observed-silent.fixture.ts` | 2 | fixture of the golden that pins: what damage observation must not see |
| `__golden__/golden-h2b1-observed-silent.test.ts` | `__golden__/golden-damage-observed-silent.test.ts` | 0 | golden that pins: what damage observation must not see |
| `__golden__/golden-h2b1-observed-tick.fixture.ts` | `__golden__/golden-damage-observed-tick.fixture.ts` | 2 | fixture of the golden that pins: a DoT tick is not a cost |
| `__golden__/golden-h2b1-observed-tick.test.ts` | `__golden__/golden-damage-observed-tick.test.ts` | 0 | golden that pins: a DoT tick is not a cost |
| `__golden__/golden-h2b1-wick-burn-heal.fixture.ts` | `__golden__/golden-wick-burn-heal.fixture.ts` | 2 | fixture of the golden that pins: the Wick burns, the Flare reacts, the heal lands on the lowest-HP hurt ally |
| `__golden__/golden-h2b1-wick-burn-heal.test.ts` | `__golden__/golden-wick-burn-heal.test.ts` | 0 | golden that pins: the Wick burns, the Flare reacts, the heal lands on the lowest-HP hurt ally |
| `__golden__/golden-h2b1-wick-gates.fixture.ts` | `__golden__/golden-wick-gates.fixture.ts` | 1 | fixture of the golden that pins: the Wick gate: no burn and no heal without another hurt ally |
| `__golden__/golden-h2b1-wick-gates.test.ts` | `__golden__/golden-wick-gates.test.ts` | 0 | golden that pins: the Wick gate: no burn and no heal without another hurt ally |
| `__golden__/golden-h2b1-wick-skips-self.fixture.ts` | `__golden__/golden-wick-skips-self.fixture.ts` | 2 | fixture of the golden that pins: the heal skips the Wick itself even when it is the most hurt ally |
| `__golden__/golden-h2b1-wick-skips-self.test.ts` | `__golden__/golden-wick-skips-self.test.ts` | 0 | golden that pins: the heal skips the Wick itself even when it is the most hurt ally |
| `__golden__/golden-h2b2-carrier-fresh.fixture.ts` | `__golden__/golden-status-snapshot-carrier-fresh.fixture.ts` | 2 | fixture of the golden that pins: a carrier applying the same status snapshots fresh from itself |
| `__golden__/golden-h2b2-carrier-fresh.test.ts` | `__golden__/golden-status-snapshot-carrier-fresh.test.ts` | 0 | golden that pins: a carrier applying the same status snapshots fresh from itself |
| `__golden__/golden-h2b2-reapply.fixture.ts` | `__golden__/golden-status-snapshot-reapply.fixture.ts` | 2 | fixture of the golden that pins: a status re-applied keeps one instance and replaces its snapshot only when strictly stronger |
| `__golden__/golden-h2b2-reapply.test.ts` | `__golden__/golden-status-snapshot-reapply.test.ts` | 0 | golden that pins: a status re-applied keeps one instance and replaces its snapshot only when strictly stronger |
| `__golden__/golden-h2b2-regen-potency.fixture.ts` | `__golden__/golden-status-snapshot-regen-potency.fixture.ts` | 2 | fixture of the golden that pins: Regen heals the frozen potency of its healer |
| `__golden__/golden-h2b2-regen-potency.test.ts` | `__golden__/golden-status-snapshot-regen-potency.test.ts` | 0 | golden that pins: Regen heals the frozen potency of its healer |
| `__golden__/golden-h2b2-spore-spread.fixture.ts` | `__golden__/golden-status-snapshot-spore-spread.fixture.ts` | 2 | fixture of the golden that pins: Spore spreads with the dying bearer's whole snapshot |
| `__golden__/golden-h2b2-spore-spread.test.ts` | `__golden__/golden-status-snapshot-spore-spread.test.ts` | 0 | golden that pins: Spore spreads with the dying bearer's whole snapshot |
| `__golden__/golden-h2b2-tick-dead-applier.fixture.ts` | `__golden__/golden-status-snapshot-tick-dead-applier.fixture.ts` | 2 | fixture of the golden that pins: a tick whose applier died keeps its frozen amount and is sourced from the bearer |
| `__golden__/golden-h2b2-tick-dead-applier.test.ts` | `__golden__/golden-status-snapshot-tick-dead-applier.test.ts` | 0 | golden that pins: a tick whose applier died keeps its frozen amount and is sourced from the bearer |
| `__golden__/golden-h2b2-tick-kill-on-death.fixture.ts` | `__golden__/golden-status-snapshot-tick-kill-on-death.fixture.ts` | 2 | fixture of the golden that pins: a tick that kills its bearer offers no triggering-source on death |
| `__golden__/golden-h2b2-tick-kill-on-death.test.ts` | `__golden__/golden-status-snapshot-tick-kill-on-death.test.ts` | 0 | golden that pins: a tick that kills its bearer offers no triggering-source on death |
| `__golden__/golden-h2b2-tick-living-applier.fixture.ts` | `__golden__/golden-status-snapshot-tick-living-applier.fixture.ts` | 2 | fixture of the golden that pins: a status tick is indirect damage from the applier snapshot, credited to the living applier |
| `__golden__/golden-h2b2-tick-living-applier.test.ts` | `__golden__/golden-status-snapshot-tick-living-applier.test.ts` | 0 | golden that pins: a status tick is indirect damage from the applier snapshot, credited to the living applier |
| `__golden__/golden-h2b2-tick-no-retaliation.fixture.ts` | `__golden__/golden-status-snapshot-tick-no-retaliation.fixture.ts` | 2 | fixture of the golden that pins: a tick from a living applier offers no triggering-source: no retaliator answers |
| `__golden__/golden-h2b2-tick-no-retaliation.test.ts` | `__golden__/golden-status-snapshot-tick-no-retaliation.test.ts` | 0 | golden that pins: a tick from a living applier offers no triggering-source: no retaliator answers |
| `__golden__/golden-h2b2-tick-self-applied.fixture.ts` | `__golden__/golden-status-snapshot-tick-self-applied.fixture.ts` | 2 | fixture of the golden that pins: a self-applied tick makes its bearer the dealer, and is never self-inflicted |
| `__golden__/golden-h2b2-tick-self-applied.test.ts` | `__golden__/golden-status-snapshot-tick-self-applied.test.ts` | 0 | golden that pins: a self-applied tick makes its bearer the dealer, and is never self-inflicted |
| `__golden__/golden-h2b2-tick-taken-factors.fixture.ts` | `__golden__/golden-status-snapshot-tick-taken-factors.fixture.ts` | 2 | fixture of the golden that pins: a tick passes through the bearer's taken factors, Defend's then Vulnerability's |
| `__golden__/golden-h2b2-tick-taken-factors.test.ts` | `__golden__/golden-status-snapshot-tick-taken-factors.test.ts` | 0 | golden that pins: a tick passes through the bearer's taken factors, Defend's then Vulnerability's |
| `__golden__/golden-h2b2-vulnerability-once.fixture.ts` | `__golden__/golden-status-snapshot-vulnerability-once.fixture.ts` | 2 | fixture of the golden that pins: Vulnerability x1.5 once, even when applied twice |
| `__golden__/golden-h2b2-vulnerability-once.test.ts` | `__golden__/golden-status-snapshot-vulnerability-once.test.ts` | 0 | golden that pins: Vulnerability x1.5 once, even when applied twice |
| `__golden__/golden-h2c-snapback.fixture.ts` | `__golden__/golden-snapjaw-snapback.fixture.ts` | 2 | fixture of the golden that pins: the real Snapjaw Jaws counterattacks at 60% of its Attack, as indirect damage |
| `__golden__/golden-h2c-snapback.test.ts` | `__golden__/golden-snapjaw-snapback.test.ts` | 0 | golden that pins: the real Snapjaw Jaws counterattacks at 60% of its Attack, as indirect damage |
| `__golden__/golden-h2d-dot-ticks.fixture.ts` | `__golden__/golden-poison-burn-spore-ticks.fixture.ts` | 2 | fixture of the golden that pins: one tick each of the real Poison, Burn and Spore |
| `__golden__/golden-h2d-dot-ticks.test.ts` | `__golden__/golden-poison-burn-spore-ticks.test.ts` | 0 | golden that pins: one tick each of the real Poison, Burn and Spore |
| `__golden__/golden-h2d-pollen-cloud.fixture.ts` | `__golden__/golden-pollen-cloud-sleep.fixture.ts` | 2 | fixture of the golden that pins: the real Pollen Cloud puts Sleep on every enemy and deals no damage |
| `__golden__/golden-h2d-pollen-cloud.test.ts` | `__golden__/golden-pollen-cloud-sleep.test.ts` | 0 | golden that pins: the real Pollen Cloud puts Sleep on every enemy and deals no damage |
| `generation-g1.test.ts` | `generation-floor-loadouts.test.ts` | 0 | floor loadouts: distinct gem sets, cast-role and boss fill |

## Identifiers (12 entries)

| Old | New | File | Count | Is |
| --- | --- | --- | --- | --- |
| `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` | `TEST_BALANCE_CONFIG` | `data/biomes.test.ts` | 1 | the balance config the tests run on |
| `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` | `TEST_BALANCE_CONFIG` | `engine/__fixtures__/balance.ts` | 1 | the balance config the tests run on |
| `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` | `TEST_BALANCE_CONFIG` | `engine/curves.test.ts` | 1 | the balance config the tests run on |
| `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` | `TEST_BALANCE_CONFIG` | `engine/generation-floor-loadouts.test.ts` | 1 | the balance config the tests run on |
| `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` | `TEST_BALANCE_CONFIG` | `engine/generation.test.ts` | 1 | the balance config the tests run on |
| `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` | `TEST_BALANCE_CONFIG` | `engine/leveling.test.ts` | 3 | the balance config the tests run on |
| `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` | `TEST_BALANCE_CONFIG` | `state/integration.test.ts` | 1 | the balance config the tests run on |
| `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` | `TEST_BALANCE_CONFIG` | `state/rewards.test.ts` | 1 | the balance config the tests run on |
| `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` | `TEST_BALANCE_CONFIG` | `state/store.test.ts` | 1 | the balance config the tests run on |
| `B5_FIXTURE` | `FIZZLE_ATTACK_FIXTURE` | `engine/__golden__/golden-fizzle-retarget-attack.fixture.ts` | 6 | the attack-path fizzle fixture's creature |
| `B5_CAST_FIXTURE` | `FIZZLE_CAST_FIXTURE` | `engine/__golden__/golden-fizzle-retarget-cast.fixture.ts` | 6 | the cast-path fizzle fixture's creature |
| `F3_SPELL_FIGHTS` | `LOCK_SPELL_FIGHTS` | `engine/__corpus__/corpus.ts` | 2 | the corpus fights that cast Silence and Pacify |

## Fixture data ids and names (103 entries)

| Old | New | File | Count | Pins |
| --- | --- | --- | --- | --- |
| `b2-confused-granted-caster-fixture` | `granted-confused-caster-fixture` | `__golden__/golden-granted-cast-confused-redirects.fixture.ts` | 1 | fixture id in the golden that pins: a confused caster's granted cast can redirect onto an ally |
| `b2-echo-fixture` | `echo-provoke-echo-fixture` | `__golden__/golden-echo-provoke-redirects.fixture.ts` | 1 | fixture id in the golden that pins: a Provoke redirects an echo, once, onto the provoker |
| `b2-silenced-granted-caster-fixture` | `fixture-lock-granted-caster-fixture` | `__golden__/golden-granted-cast-refused-by-fixture-lock.fixture.ts` | 1 | fixture id in the golden that pins: a trait-borne fixture lock refuses a granted cast and draws nothing |
| `b2-stunned-granted-caster-fixture` | `granted-skipped-stunned-caster-fixture` | `__golden__/golden-granted-cast-refused-on-skipped-turn.fixture.ts` | 1 | fixture id in the golden that pins: a skipped turn refuses the granted cast, after rolling |
| `b4-golden-tick` | `exact-instance-cleanse-tick` | `__golden__/golden-exact-instance-cleanse-then-tick.fixture.ts` | 1 | fixture id in the golden that pins: exact-instance rule: cleanse, then tick |
| `b4-cleanse-then-tick-fixture` | `exact-instance-cleanse-then-tick-fixture` | `__golden__/golden-exact-instance-cleanse-then-tick.fixture.ts` | 1 | fixture id in the golden that pins: exact-instance rule: cleanse, then tick |
| `b4-golden-tick-2` | `exact-instance-reapply-tick` | `__golden__/golden-exact-instance-remove-then-reapply.fixture.ts` | 1 | fixture id in the golden that pins: exact-instance rule: remove, then reapply |
| `b4-remove-then-reapply-fixture` | `exact-instance-remove-then-reapply-fixture` | `__golden__/golden-exact-instance-remove-then-reapply.fixture.ts` | 1 | fixture id in the golden that pins: exact-instance rule: remove, then reapply |
| `b5-cast-fixture` | `fizzle-cast-fixture` | `__golden__/golden-fizzle-retarget-cast.fixture.ts` | 1 | fixture id in the golden that pins: pre-hit-hook fizzle on the Cast path, then the rule-4 re-target |
| `B5 cast (fixture)` | `fizzle cast (fixture)` | `__golden__/golden-fizzle-retarget-cast.fixture.ts` | 1 | fixture id in the golden that pins: pre-hit-hook fizzle on the Cast path, then the rule-4 re-target |
| `b5-fixture` | `fizzle-attack-fixture` | `__golden__/golden-fizzle-retarget-attack.fixture.ts` | 1 | fixture id in the golden that pins: pre-hit-hook fizzle on the Attack path, then the rule-4 re-target |
| `B5 (fixture)` | `fizzle attack (fixture)` | `__golden__/golden-fizzle-retarget-attack.fixture.ts` | 1 | fixture id in the golden that pins: pre-hit-hook fizzle on the Attack path, then the rule-4 re-target |
| `b6-stun-fixture` | `provoke-stun-stun-fixture` | `__golden__/golden-provoke-stun-cleanup.fixture.ts` | 1 | fixture id in the golden that pins: a provoker Stunned before its next turn stops provoking at that turn start |
| `b6-stun-on-hit-fixture` | `provoke-stun-stun-on-hit-fixture` | `__golden__/golden-provoke-stun-cleanup.fixture.ts` | 1 | fixture id in the golden that pins: a provoker Stunned before its next turn stops provoking at that turn start |
| `b6-attack-lowest` | `provoke-stun-attack-lowest` | `__golden__/golden-provoke-stun-cleanup.fixture.ts` | 2 | fixture id in the golden that pins: a provoker Stunned before its next turn stops provoking at that turn start |
| `b6-always-provoke` | `provoke-stun-always-provoke` | `__golden__/golden-provoke-stun-cleanup.fixture.ts` | 2 | fixture id in the golden that pins: a provoker Stunned before its next turn stops provoking at that turn start |
| `b6-always-wait` | `provoke-stun-always-wait` | `__golden__/golden-provoke-stun-cleanup.fixture.ts` | 2 | fixture id in the golden that pins: a provoker Stunned before its next turn stops provoking at that turn start |
| `d3-revive-exclusion-fixture` | `revive-cap-exclusion-fixture` | `__golden__/golden-revive-cap-exclusion.fixture.ts` | 1 | fixture id in the golden that pins: revive cap: a capped dead ally is excluded from the pool |
| `d3-revive-fizzle-fixture` | `revive-cap-fizzle-fixture` | `__golden__/golden-revive-cap-fizzle.fixture.ts` | 1 | fixture id in the golden that pins: revive cap: the 11th attempt fizzles and draws nothing |
| `e-overtone-fixture` | `echo-chain-overtone-fixture` | `__golden__/golden-echo-chain-truncated.fixture.ts` | 1 | fixture id in the golden that pins: an echo chain through the same Overtone, truncated at the real cap |
| `e-echo-fixture` | `grant-queue-echo-fixture` | `__golden__/golden-grant-actor-dies-first.fixture.ts` | 1 | fixture id in the golden that pins: a queued grant whose actor died first emits nothing |
| `e-retaliate-fixture` | `grant-queue-retaliate-fixture` | `__golden__/golden-grant-actor-dies-first.fixture.ts` | 1 | fixture id in the golden that pins: a queued grant whose actor died first emits nothing |
| `e-t1-defend-fixture` | `grant-queue-t1-defend-fixture` | `__golden__/golden-grant-during-granted-action.fixture.ts` | 1 | fixture id in the golden that pins: a grant raised during a granted action queues FIFO |
| `e-t2-provoke-fixture` | `grant-queue-t2-provoke-fixture` | `__golden__/golden-grant-during-granted-action.fixture.ts` | 1 | fixture id in the golden that pins: a grant raised during a granted action queues FIFO |
| `e-t3-wait-fixture` | `grant-queue-t3-wait-fixture` | `__golden__/golden-grant-during-granted-action.fixture.ts` | 1 | fixture id in the golden that pins: a grant raised during a granted action queues FIFO |
| `f2-poisoner-fixture` | `status-timing-poisoner-fixture` | `__golden__/golden-status-timing-dot-one-turn.fixture.ts` | 1 | fixture id in the golden that pins: a 1-turn DoT ticks once; a self-applied one is born and ticks next turn |
| `f2-self-poison-fixture` | `status-timing-self-poison-fixture` | `__golden__/golden-status-timing-dot-one-turn.fixture.ts` | 1 | fixture id in the golden that pins: a 1-turn DoT ticks once; a self-applied one is born and ticks next turn |
| `f2-stunner-fixture` | `status-timing-stunner-fixture` | `__golden__/golden-status-timing-stun-one-turn.fixture.ts` | 1 | fixture id in the golden that pins: Stun 1 skips exactly one turn, applied before or after the applier in the queue |
| `f2-self-stun-fixture` | `status-timing-self-stun-fixture` | `__golden__/golden-status-timing-turnstart-self-stun-once.fixture.ts` | 1 | fixture id in the golden that pins: a Stun 1 gained in the own turn-start hooks skips exactly one turn |
| `f2-weakener-fixture` | `status-timing-weakener-fixture` | `__golden__/golden-status-timing-weaken-three-turns.fixture.ts` | 1 | fixture id in the golden that pins: a 3-turn Weaken covers the next three bearer turns |
| `f2-web-cast-fixture` | `status-timing-web-cast-fixture` | `__golden__/golden-status-timing-web-turn-end-roll.fixture.ts` | 1 | fixture id in the golden that pins: the Web roll is in turn-end cleanup and skips a Web applied this turn |
| `f2-cast-once-then-wait` | `status-timing-cast-once-then-wait` | `__golden__/golden-status-timing-web-turn-end-roll.fixture.ts` | 1 | fixture id in the golden that pins: the Web roll is in turn-end cleanup and skips a Web applied this turn |
| `f2-self-poison-at-start-fixture` | `status-timing-self-poison-at-start-fixture` | `__golden__/golden-status-timing-win-over-own-tick.fixture.ts` | 1 | fixture id in the golden that pins: the last survivor empties the enemy side and wins over its own tick |
| `f3-opening-strike-fixture` | `lock-timing-opening-strike-fixture` | `__golden__/golden-fight-start-wipe.fixture.ts` | 1 | fixture id in the golden that pins: a fight-start wipe ends the fight before RoundStarted |
| `f3-bolt-fixture` | `lock-timing-bolt-fixture` | `__golden__/golden-lock-immunity.fixture.ts` | 1 | fixture id in the golden that pins: Clear Mind and Aggressive let the locked action through while the status lands |
| `f3-granted-cast-fixture` | `lock-timing-granted-cast-fixture` | `__golden__/golden-lock-immunity.fixture.ts` | 1 | fixture id in the golden that pins: Clear Mind and Aggressive let the locked action through while the status lands |
| `f3-mage-if-silenced` | `lock-timing-mage-if-silenced` | `__golden__/golden-lock-immunity.fixture.ts` | 1 | fixture id in the golden that pins: Clear Mind and Aggressive let the locked action through while the status lands |
| `f3-brawler-if-pacified` | `lock-timing-brawler-if-pacified` | `__golden__/golden-lock-immunity.fixture.ts` | 1 | fixture id in the golden that pins: Clear Mind and Aggressive let the locked action through while the status lands |
| `f3-silencer-script` | `lock-timing-silencer-script` | `__golden__/golden-lock-immunity.fixture.ts` | 1 | fixture id in the golden that pins: Clear Mind and Aggressive let the locked action through while the status lands |
| `f3-pacifier-script` | `lock-timing-pacifier-script` | `__golden__/golden-lock-immunity.fixture.ts` | 1 | fixture id in the golden that pins: Clear Mind and Aggressive let the locked action through while the status lands |
| `f3-bolt-fixture` | `lock-timing-bolt-fixture` | `__golden__/golden-pacify-three-turns.fixture.ts` | 1 | fixture id in the golden that pins: Pacify locks its target's Attack for its next three own turns |
| `f3-apply-lowest` | `lock-timing-apply-lowest` | `__golden__/golden-pacify-three-turns.fixture.ts` | 1 | fixture id in the golden that pins: Pacify locks its target's Attack for its next three own turns |
| `f3-apply-highest` | `lock-timing-apply-highest` | `__golden__/golden-pacify-three-turns.fixture.ts` | 1 | fixture id in the golden that pins: Pacify locks its target's Attack for its next three own turns |
| `f3-bolt-fixture` | `lock-timing-bolt-fixture` | `__golden__/golden-silence-three-turns.fixture.ts` | 1 | fixture id in the golden that pins: Silence locks its target's Cast for its next three own turns |
| `f3-apply-lowest` | `lock-timing-apply-lowest` | `__golden__/golden-silence-three-turns.fixture.ts` | 1 | fixture id in the golden that pins: Silence locks its target's Cast for its next three own turns |
| `f3-apply-highest` | `lock-timing-apply-highest` | `__golden__/golden-silence-three-turns.fixture.ts` | 1 | fixture id in the golden that pins: Silence locks its target's Cast for its next three own turns |
| `f3-bolt-fixture` | `lock-timing-bolt-fixture` | `__golden__/golden-granted-cast-refused-by-silenced-status.fixture.ts` | 1 | fixture id in the golden that pins: the real Silenced status from the real Silence spell refuses a granted cast (the real-status mirror of the fixture-lock golden) |
| `f3-granted-cast-fixture` | `lock-timing-granted-cast-fixture` | `__golden__/golden-granted-cast-refused-by-silenced-status.fixture.ts` | 1 | fixture id in the golden that pins: the real Silenced status from the real Silence spell refuses a granted cast (the real-status mirror of the fixture-lock golden) |
| `h2a-grant-attack` | `additional-grant-attack` | `__golden__/golden-additional-granted.fixture.ts` | 1 | fixture id in the golden that pins: a granted Attack stays direct and gets the Additional |
| `h2a-two-instance` | `additional-two-instance` | `__golden__/golden-additional-second-instance.fixture.ts` | 1 | fixture id in the golden that pins: the Additional lands on the second attack instance too |
| `h2a-nova` | `additional-nova` | `__golden__/golden-additional-spell.fixture.ts` | 1 | fixture id in the golden that pins: the Additional lands on every direct hit of a spell |
| `h2a-bolt` | `additional-bolt` | `__golden__/golden-additional-spell.fixture.ts` | 1 | fixture id in the golden that pins: the Additional lands on every direct hit of a spell |
| `h2a-cast-slot-0` | `additional-cast-slot-0` | `__golden__/golden-additional-spell.fixture.ts` | 1 | fixture id in the golden that pins: the Additional lands on every direct hit of a spell |
| `h2a-wait` | `additional-wait` | `__golden__/golden-additional-spell.fixture.ts` | 1 | fixture id in the golden that pins: the Additional lands on every direct hit of a spell |
| `h2a-splashing` | `additional-splashing` | `__golden__/golden-additional-splashing.fixture.ts` | 1 | fixture id in the golden that pins: the Additional lands on every Splashing hit |
| `h2a-cost-via-selector` | `cost-via-selector` | `__golden__/golden-cost-and-tick-exclusion.fixture.ts` | 1 | fixture id in the golden that pins: the cost rule and the DoT-tick exclusion |
| `h2a-zero-cost-dot-label` | `cost-zero-cost-dot-label` | `__golden__/golden-cost-and-tick-exclusion.fixture.ts` | 1 | fixture id in the golden that pins: the cost rule and the DoT-tick exclusion |
| `h2a-mini-poison` | `cost-mini-poison` | `__golden__/golden-cost-and-tick-exclusion.fixture.ts` | 1 | fixture id in the golden that pins: the cost rule and the DoT-tick exclusion |
| `h2a-poison-self` | `cost-poison-self` | `__golden__/golden-cost-and-tick-exclusion.fixture.ts` | 1 | fixture id in the golden that pins: the cost rule and the DoT-tick exclusion |
| `h2a-flat-20` | `indirect-flat-20` | `__golden__/golden-indirect-flat-response.fixture.ts` | 1 | fixture id in the golden that pins: flat-mode response damage on another creature is indirect |
| `h2a-flat-3` | `indirect-flat-3` | `__golden__/golden-indirect-flat-response.fixture.ts` | 1 | fixture id in the golden that pins: flat-mode response damage on another creature is indirect |
| `h2a-keeps-hit` | `indirect-keeps-hit` | `__golden__/golden-indirect-keeps-terms.fixture.ts` | 1 | fixture id in the golden that pins: indirect damage keeps affinity, dealt, conditional, taken and penetration terms, and gets no Additional |
| `h2a-keeps-dealt` | `indirect-keeps-dealt` | `__golden__/golden-indirect-keeps-terms.fixture.ts` | 1 | fixture id in the golden that pins: indirect damage keeps affinity, dealt, conditional, taken and penetration terms, and gets no Additional |
| `h2a-keeps-conditional` | `indirect-keeps-conditional` | `__golden__/golden-indirect-keeps-terms.fixture.ts` | 1 | fixture id in the golden that pins: indirect damage keeps affinity, dealt, conditional, taken and penetration terms, and gets no Additional |
| `h2a-keeps-taken` | `indirect-keeps-taken` | `__golden__/golden-indirect-keeps-terms.fixture.ts` | 1 | fixture id in the golden that pins: indirect damage keeps affinity, dealt, conditional, taken and penetration terms, and gets no Additional |
| `h2a-keeps-penetration` | `indirect-keeps-penetration` | `__golden__/golden-indirect-keeps-terms.fixture.ts` | 1 | fixture id in the golden that pins: indirect damage keeps affinity, dealt, conditional, taken and penetration terms, and gets no Additional |
| `h2a-hit-highest` | `indirect-hit-highest` | `__golden__/golden-indirect-trait-response.fixture.ts` | 1 | fixture id in the golden that pins: a trait response is indirect damage: a fifth of Defence, Defend, no cross-stat |
| `h2a-hit-lowest` | `indirect-hit-lowest` | `__golden__/golden-indirect-trait-response.fixture.ts` | 1 | fixture id in the golden that pins: a trait response is indirect damage: a fifth of Defence, Defend, no cross-stat |
| `h2a-shield-bash` | `indirect-shield-bash` | `__golden__/golden-indirect-trait-response.fixture.ts` | 1 | fixture id in the golden that pins: a trait response is indirect damage: a fifth of Defence, Defend, no cross-stat |
| `h2a-cast-slot-0` | `spell-on-caster-cast-slot-0` | `__golden__/golden-spell-on-caster-direct.fixture.ts` | 1 | fixture id in the golden that pins: a spell effect on its own caster is direct damage |
| `h2a-wait` | `spell-on-caster-wait` | `__golden__/golden-spell-on-caster-direct.fixture.ts` | 1 | fixture id in the golden that pins: a spell effect on its own caster is direct damage |
| `h2a-self-hit` | `spell-on-caster-self-hit` | `__golden__/golden-spell-on-caster-direct.fixture.ts` | 1 | fixture id in the golden that pins: a spell effect on its own caster is direct damage |
| `h2b1-pay` | `damage-observed-pay` | `__golden__/golden-damage-observed-cost.fixture.ts` | 1 | fixture id in the golden that pins: damage observation of a cost |
| `h2b1-watch-ally` | `damage-observed-watch-ally` | `__golden__/golden-damage-observed-cost.fixture.ts` | 1 | fixture id in the golden that pins: damage observation of a cost |
| `h2b1-watch-enemy` | `damage-observed-watch-enemy` | `__golden__/golden-damage-observed-cost.fixture.ts` | 1 | fixture id in the golden that pins: damage observation of a cost |
| `h2b1-self-hit` | `damage-observed-self-hit` | `__golden__/golden-damage-observed-silent.fixture.ts` | 1 | fixture id in the golden that pins: what damage observation must not see |
| `h2b1-cast-slot-0` | `damage-observed-cast-slot-0` | `__golden__/golden-damage-observed-silent.fixture.ts` | 1 | fixture id in the golden that pins: what damage observation must not see |
| `h2b1-zero-cost` | `damage-observed-zero-cost` | `__golden__/golden-damage-observed-silent.fixture.ts` | 1 | fixture id in the golden that pins: what damage observation must not see |
| `h2b1-watch` | `damage-observed-watch` | `__golden__/golden-damage-observed-silent.fixture.ts` | 1 | fixture id in the golden that pins: what damage observation must not see |
| `h2b1-mini-poison` | `damage-observed-mini-poison` | `__golden__/golden-damage-observed-tick.fixture.ts` | 1 | fixture id in the golden that pins: a DoT tick is not a cost |
| `h2b1-poison-self` | `damage-observed-poison-self` | `__golden__/golden-damage-observed-tick.fixture.ts` | 1 | fixture id in the golden that pins: a DoT tick is not a cost |
| `h2b1-tick-watch` | `damage-observed-tick-watch` | `__golden__/golden-damage-observed-tick.fixture.ts` | 1 | fixture id in the golden that pins: a DoT tick is not a cost |
| `h2b2-reapply-p1` | `status-snapshot-reapply-p1` | `__golden__/golden-status-snapshot-reapply.fixture.ts` | 1 | fixture id in the golden that pins: a status re-applied keeps one instance and replaces its snapshot only when strictly stronger |
| `h2b2-reapply-p2` | `status-snapshot-reapply-p2` | `__golden__/golden-status-snapshot-reapply.fixture.ts` | 1 | fixture id in the golden that pins: a status re-applied keeps one instance and replaces its snapshot only when strictly stronger |
| `h2b2-reapply-p3` | `status-snapshot-reapply-p3` | `__golden__/golden-status-snapshot-reapply.fixture.ts` | 1 | fixture id in the golden that pins: a status re-applied keeps one instance and replaces its snapshot only when strictly stronger |
| `h2b2-reapply-p4` | `status-snapshot-reapply-p4` | `__golden__/golden-status-snapshot-reapply.fixture.ts` | 1 | fixture id in the golden that pins: a status re-applied keeps one instance and replaces its snapshot only when strictly stronger |
| `h2b2-regen-halve` | `status-snapshot-regen-halve` | `__golden__/golden-status-snapshot-regen-potency.fixture.ts` | 1 | fixture id in the golden that pins: Regen heals the frozen potency of its healer |
| `h2b2-wait-then-attack` | `status-snapshot-wait-then-attack` | `__golden__/golden-status-snapshot-regen-potency.fixture.ts` | 1 | fixture id in the golden that pins: Regen heals the frozen potency of its healer |
| `h2b2-dead-dealer` | `status-snapshot-dead-dealer` | `__golden__/golden-status-snapshot-tick-dead-applier.fixture.ts` | 1 | fixture id in the golden that pins: a tick whose applier died keeps its frozen amount and is sourced from the bearer |
| `h2b2-dead-wait-then-attack` | `status-snapshot-dead-wait-then-attack` | `__golden__/golden-status-snapshot-tick-dead-applier.fixture.ts` | 1 | fixture id in the golden that pins: a tick whose applier died keeps its frozen amount and is sourced from the bearer |
| `h2b2-last-words` | `status-snapshot-last-words` | `__golden__/golden-status-snapshot-tick-kill-on-death.fixture.ts` | 1 | fixture id in the golden that pins: a tick that kills its bearer offers no triggering-source on death |
| `h2b2-living-surge` | `status-snapshot-living-surge` | `__golden__/golden-status-snapshot-tick-living-applier.fixture.ts` | 1 | fixture id in the golden that pins: a status tick is indirect damage from the applier snapshot, credited to the living applier |
| `h2b2-living-lifesteal` | `status-snapshot-living-lifesteal` | `__golden__/golden-status-snapshot-tick-living-applier.fixture.ts` | 1 | fixture id in the golden that pins: a status tick is indirect damage from the applier snapshot, credited to the living applier |
| `h2b2-living-bonus` | `status-snapshot-living-bonus` | `__golden__/golden-status-snapshot-tick-living-applier.fixture.ts` | 1 | fixture id in the golden that pins: a status tick is indirect damage from the applier snapshot, credited to the living applier |
| `h2b2-wait-then-defend` | `status-snapshot-wait-then-defend` | `__golden__/golden-status-snapshot-tick-living-applier.fixture.ts` | 1 | fixture id in the golden that pins: a status tick is indirect damage from the applier snapshot, credited to the living applier |
| `h2b2-self-dealer` | `status-snapshot-self-dealer` | `__golden__/golden-status-snapshot-tick-self-applied.fixture.ts` | 1 | fixture id in the golden that pins: a self-applied tick makes its bearer the dealer, and is never self-inflicted |
| `h2b2-self-watch` | `status-snapshot-self-watch` | `__golden__/golden-status-snapshot-tick-self-applied.fixture.ts` | 1 | fixture id in the golden that pins: a self-applied tick makes its bearer the dealer, and is never self-inflicted |
| `h2b2-taken-wait-then-defend` | `status-snapshot-taken-wait-then-defend` | `__golden__/golden-status-snapshot-tick-taken-factors.fixture.ts` | 1 | fixture id in the golden that pins: a tick passes through the bearer's taken factors, Defend's then Vulnerability's |
| `random-target-b3-fixture` | `random-target-fixture` | `combat.test.ts` | 1 | fixture id in this unit test |
| `b4-tick-fixture` | `exact-instance-tick-fixture` | `resolution.test.ts` | 6 | fixture id in this unit test |
| `b4-cleanser-fixture` | `exact-instance-cleanser-fixture` | `resolution.test.ts` | 1 | fixture id in this unit test |
| `b4-reapply-fixture` | `exact-instance-reapply-fixture` | `resolution.test.ts` | 1 | fixture id in this unit test |
| `h2b2-seeder` | `status-snapshot-seeder` | `status-snapshot.test.ts` | 1 | fixture id in this unit test |
