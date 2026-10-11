# Hand rewrites (4.2-H2): old -> new, the why quoted from both sides

At least one per folder (`app`, `data`, `engine`, `state`, `ui`) and per config. The whole set is `git diff origin/main`;
this is a sample chosen to show the *why* surviving where the provenance went.

## app

`src/app/demoFight.ts:16-21` (a forward pointer, D3: the demo harness cites the rule that says Phase 7 replaces it)

- old: `This file and CombatDemo.tsx are a throwaway harness; Phase 7 replaces them. / Successor to the Phase 2.5 harness: Phase 3.5 wires real trait/status/spell content (src/data/traits/, ...) onto the same scripted parties so triggers, DoT, stun, and stat-modifier statuses actually fire in the log.`
- new: `This file and CombatDemo.tsx are a throwaway harness (` + "`CONVENTIONS.md#every-feature-phase-ships-a-demo`" + `). Real trait/status/spell content (src/data/traits/, ...) is wired onto the same scripted parties so triggers, DoT, stun, and stat-modifier statuses actually fire in the log.`
- why kept: "throwaway harness" and "triggers, DoT, stun, and stat-modifier statuses actually fire in the log" are both sides' reason; the wait ("Phase 7's real combat UI replaces them all") is now stated once, in the cited rule.

## data

`src/data/specializations.ts:125` (and eight more, `:133 :141 :149 :157 :185 :193 :201 :409`; the nine inert perks, D3)

- old: `// Inert until Phase 8 (gem system) -- see sorcerer.md`
- new: ``// Inert (gem system): `specializations/sorcerer.md#wit-mastery` `` (the `id:` on the next line is `wit-mastery`; the other seven Sorcerer lines cite their own entry, line 409 cites `specializations/shieldbarer.md#shield-specialist` with "(equipment system)")
- why kept: "Inert" and "(gem system)" on both sides; the entry says "Inert (needs Phase 8)." (`forward-pointers.md`).

`src/data/species/starters.ts:87-90` (a trap that stays, fix 4 of the plan review)

- old: `// 4.1-H2c: Health 39 is the ASSUMPTION 125 remap of 25; Attack 15 is ASSUMPTION 123 (was 10).` / `// 4.1-H2c (ASSUMPTION 123): 'warden', was 'taunter' ("always: Provoke"), which never attacked.`
- new: `// 'warden', not 'taunter' ("always: Provoke"): taunter provokes every turn, so it never attacks.`
- why kept: "which never attacked" on the old side, "taunter provokes every turn, so it never attacks" on the new, checked against `TAUNTER_SCRIPT` in `src/data/scripts.ts` (rule 1 is `always -> provoke`; its own comment says rules 2 and 3 "never run in practice"). The numbers' provenance (the remap, "was 10") went.

## engine

`src/engine/effect-types.ts:98-105` (`MagnitudeSource`)

- old: `ASSUMPTION (Slice D, not literally shaped by the brief -- spec/effects.md#count-scaling/the vocabulary table name the mechanism, "a modifier... may declare magnitudeSource... instead of a flat number," but not how it composes with a host's formula). Interpreted here as the SOURCE of the repetition count a host field multiplies/exponentiates its own authored rate by ... Absent means a count of one, so every call site is byte-identical when magnitudeSource is absent (ASSUMPTION 16). ... Flagged for review: stat-modifier's factor is NOT wired to this source in this slice ... deferred to whichever slice first authors a count-scaled stat-modifier (H1's Swarmhive Striker).`
- new: `The SOURCE of the repetition count a host field multiplies/exponentiates its own authored rate by (deal-damage's spellPower, damage-modifier's magnitude×count or magnitude**count; ` + "`spec/effects.md#count-scaling`" + `). Absent means a count of one, so every call site is byte-identical when magnitudeSource is absent. ... ` + "`stat-modifier`'s `factor`" + ` is NOT wired to this source on the standalone EffectDef (see StatModifierDef's own comment); ` + "`apply-stat-modifier`" + ` carries it instead.`
- why kept: "the SOURCE of the repetition count a host field multiplies/exponentiates its own authored rate by" and "absent means a count of one" are on both sides; the deferral became its present-tense consequence, checked against `StatModifierDef`'s note ("`magnitudeSource` lands on the `apply-stat-modifier` EffectResponse").

`src/engine/__golden__/golden-hollowkin-wretch-self-dot.fixture.ts:1-8` (a golden's history goes, its trap stays)

- old: `Golden: PR #64 review fix 3 -- triggering-source never resolves to the firing creature itself. A SELF-APPLIED DoT tick (applier = bearer) has the bearer as its source; before the fix, on-damage-taken's hook context then had context.source === context.self. ... Before the fix, Hollowkin Wretch's real on-damage-taken -> apply-status(triggering-source, confusion) trait would resolve triggering-source to WRETCH itself and confuse its own bearer off its own Poison tick.`
- new: `Golden: triggering-source never resolves to the firing creature itself. A SELF-APPLIED DoT tick (applier = bearer) has the bearer as its source; were on-damage-taken's hook context context.source === context.self, Hollowkin Wretch's real ... trait would resolve triggering-source to WRETCH itself and confuse its own bearer off its own Poison tick.`
- why kept: "would resolve triggering-source to WRETCH itself and confuse its own bearer off its own Poison tick" is the trap on both sides; "before the fix" became a conditional.

`src/engine/resolution-types.ts:97` (the old rule numbers, brief residue)

- old: `a refused granted action emits nothing of its own (spec/responses.md#perform-action B2 rule 2).`
- new: ``a refused granted action emits nothing of its own (`spec/combat.md#every-action-source-obeys-the-same-rules`).``
- why kept: the sentence is unchanged; the anchor now names the heading whose rule 2 and "A refused grant emits nothing of its own" state it (the old anchor's section did not).

## state

`src/state/store.ts:104` (an `// ASSUMPTION:` marker that was not a live open question)

- old: `// ASSUMPTION: a fixed default so the store is constructible with zero config; a real new-game flow (a later phase) lets the player's save generation seed this instead.`
- new: ``// A fixed default so the store is constructible with zero config; the real seed is generated in `src/app` (`spec/store.md#newgame`).``
- why kept: "a fixed default so the store is constructible with zero config" on both sides; the wait ("a later phase") is replaced by the settled fact, checked against `spec/store.md#newgame` ("The seed is generated in `src/app`") and `src/app/newGame.ts`.

`src/state/integration.test.ts:187-218` (re-pin narration -> the derivation that is true now)

- old: `4.1-H2a re-pin (the Additional): this used to assert revivedCount > 0. ... 4.1-H2c re-pin (0 -> 1; ...) ... 4.1-H2d re-pin (1 -> 0; ...). The count moved first at stage 2 of the digest attribution ... At 30% the opening counter was 30 x 0.3 x 0.75 - 3 = 3.75 -> 3 ...`
- new: `No Revived event: nobody dies in these fights, so the Unicorn's trigger fires on every Unicorn attack but its random-dead-ally pool is empty: a targeting fizzle (spec/responses.md#fizzles), not a suppressed trigger.` followed by the 60%-of-Attack arithmetic (`30 x 0.6 = 18 ... Unicorn 29 -> 11 ... Brute 33 -> 18 -> 3`), which is what the test asserts today.
- why kept: "a targeting fizzle, not a suppressed trigger" and the numbers of the current derivation; the 30% arithmetic is history and went (A13).

## ui

`src/ui/CombatDemo.tsx:8-13, 19` (forward pointer, D3)

- old: `Throwaway dev harness proving the engine runs end-to-end in the browser. Phase 7 (Combat UI & feedback) replaces this with real combat presentation once Phase 4 content exists. Do not grow this toward real combat UI (sprites, health bars, animation) or toward a script-authoring UI -- that is Phase 6/7 scope. This is a viewer, not an editor: both sides run real scripts through the Phase 2 interpreter, with real Phase 3 traits/statuses wired onto the demo parties.`
- new: ``Throwaway dev harness proving the engine runs end-to-end in the browser (`CONVENTIONS.md#every-feature-phase-ships-a-demo`). Do not grow this toward real combat UI (sprites, health bars, animation) or toward a script-authoring UI. This is a viewer, not an editor: both sides run real scripts through the interpreter, with real traits/statuses wired onto the demo parties.``
- why kept: "proving the engine runs end-to-end in the browser", "a viewer, not an editor"; the rule says the harness is a throwaway, text-log viewer and where the real UI comes in.

## vite.config.ts

`vite.config.ts:10-20` (plan review fix 3)

- old: `Phase 4.1-A (S4): src/engine, src/data and src/state run in Node -- this ALSO enforces engine purity (DOM globals are undefined there, ...). ... Review fix F2: the Node project's include is now a single catch-all ... NOT an enumerated list -- an enumerated list silently drops any test under a NEW top-level folder (verified: a throwaway src/zzprobe/x.test.ts was collected by NEITHER project and never ran). ASSUMPTION 24 ("any new top-level test folder defaults to Node unless it renders React") is now actually true of the config, not just documented.`
- new: ``The Node/jsdom split and why Node also enforces engine purity are `CONVENTIONS.md#test-environments`. src/ui and src/app render React, so they keep jsdom. The Node project's `include` is a single catch-all (`src/**/*.test.{ts,tsx}`) minus the jsdom project's own two folders, NOT an enumerated `src/{engine,data,state}` list -- an enumerated list silently drops any test under a NEW top-level folder, which no project would collect.``
- why kept: the engine-purity why moved to its rule; the catch-all-versus-enumerated trap stays. "ASSUMPTION 24" has no home in `CONVENTIONS.md#test-environments` (it names the folders, not the default): a Spec question.

## eslint.config.js

`eslint.config.js:27`

- old: `Phase 4.1-C2a (PR #71 review): src/ must never import Node built-ins -- engine purity (CONVENTIONS.md#the-engine-is-pure-and-deterministic) and browser portability for src/ui/src/app.`
- new: `src/ must never import Node built-ins -- engine purity (CONVENTIONS.md#the-engine-is-pure-and-deterministic) and browser portability for src/ui/src/app.` (the next lines, the shim and `types` explanation, are untouched)
- why kept: the sentence and its citation are unchanged; only the provenance label went (the citation was already there).
