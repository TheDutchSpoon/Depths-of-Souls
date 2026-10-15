# Click-through, 4.5-G2

Edge via Playwright (scratch install outside the repo), dev server, one fresh page per section, separate from the first-clear session. `Party slot n` is 1-based. Screenshots were kept in scratch, not the repo.

```

## Party and Collection
start party: inst-0,inst-1,,,,
PASS swap of two party slots: inst-1,inst-0,,,,
PASS a slot emptied: inst-1,,,,,
collection: Collection /  / Creatures outside the party. The party's creatures are listed under Party. /  / Cragfang Mauler, Lv 1 | XP 10 / 20 | Violence | Rare | script striker | traits Double Strike | gems Thorn Volley, Weakening Bite, Thorn Lash
PASS collection lists the benched creature with gems by spell name
PASS a benched instance onto an occupied slot benches the occupant: inst-0,,,,,
PASS the displaced creature is in the collection
PASS whole party emptied: Descend greyed
empty-party text: The party is empty: put a creature in it first.
PASS refilled: Descend enabled: inst-1,inst-0,,,,
line-up after reorder: Allies / Unicorn Lightbearer: level 1, 39 HP / Cragfang Mauler: level 1, 33 HP / 
PASS line-up lists the reordered party first-slot-first

## Souls, summons, labels, and hub actions mid-playback
below 100%: Souls / Spider Weaver: 25% Summon Not enough soul: summoning needs 100%. / Snapjaw Jaws: 20% Summon Not enough soul: summoning needs 100%. / Pollinator Beneficiary: 20% Summon Not enough soul: summoning needs 100%. / Snapjaw Lure: 25% Summon Not enough soul: summoning needs 100%. / Swarmhive Drone: 25% Summon Not enough soul: summoning needs 100%. / Pollinator Pollenlord: 20% Summon Not enough soul: summoning needs 100%. / Lullpollen Sleeper: 25% Summon Not enough soul: summoning needs 100%. / Swarmhive Queen: 10% Summon Not enough soul: summoning needs 100%. / Treant Elder: 20% Summon Not enough soul: summoning needs 100%.
PASS Summon greyed with its reason below 100%
descents to a 100% soul: 3
viewer line counts: t=0 33, +4s undisturbed 39, +4s with summon/reorder/boss kill 46
PASS playback keeps running across hub actions: (+6 undisturbed, +7 disturbed)
PASS summon went into a free party slot: 2 -> 3
PASS party full and a summon landed on the bench: Collection /  / Creatures outside the party. The party's creatures are listed under Party. /  / Spider Weaver #5, Lv 1 | XP 0 / 20 | Wit | Common | script caster | traits Web Strike | gems Pollen Cloud, Pacify, Vine Snare / Spider Weaver #6, Lv 1 | XP 0 / 20 | Wit | Common | script caster | traits W
dropdown labels: empty ; Cragfang Mauler, Lv 2 ; Unicorn Lightbearer, Lv 2 ; Spider Weaver #1, Lv 1 ; Spider Weaver #2, Lv 1 ; Spider Weaver #3, Lv 1 ; Spider Weaver #4, Lv 1 ; Spider Weaver #5, Lv 1 ; Spider Weaver #6, Lv 1 ; Spider Weaver #7, Lv 1
PASS repeat summons labelled #1, #2...
PASS a second summon at 100% stays available

## Perks, Debug, Refund, switcher, New game
Debug bosses offered: Broodmother, Leech Sovereign, Rot Sovereign
PASS a repeat boss kill changes nothing: 100 earned, 0 spent, 100 free
PASS levels bought: 100 earned, 100 spent, 0 free
PASS over-budget shown: Flurry: 0 / 1, 100 per level  Set Not enough free perk points for that level.
PASS invalid-level shown for "abc"
PASS invalid-level shown for ""
PASS invalid-level shown for "2.5"
PASS invalid-level shown for "-1"
PASS invalid-level shown for "9999"
FAIL an inactive perk is labelled
PASS Refund all: 100 earned, 0 spent, 100 free
PASS level / max reads the spend after refund
after all bosses: 300 earned, 0 spent, 300 free
PASS switcher offers only the other specs: Switch to Sorcerer, Switch to Shieldbarer
before switch: 300 earned, 20 spent, 280 free
PASS a switch refunds: spent back to 0: 300 earned, 0 spent, 300 free
PASS the new spec starter is in the party or collection
PASS New game returns to the start screen with the old run still in the side panel
PASS a fresh Start resets the store```

The one FAIL line is the script's: it ran the inactive-label check on Brute, which has no inactive perk (the nine ids are Sorcerer's and Shieldbarer's). The label on Sorcerer's page (probe of the perk list on a fresh Start, default spec Sorcerer):

```
"Echo: 0 / 1, 100 per level  Set"
"Wit Mastery: 0 / 1, 60 per level (inactive (its system isn't built yet))  Set"
"Violence Mastery: 0 / 1, 60 per level (inactive (its system isn't built yet))  Set"
"Endurance Mastery: 0 / 1, 60 per level (inactive (its system isn't built yet))  Set"
"Vitality Mastery: 0 / 1, 60 per level (inactive (its system isn't built yet))  Set"
"Instinct Mastery: 0 / 1, 60 per level (inactive (its system isn't built yet))  Set"
"Clear Mind: 0 / 1, 100 per level  Set"
"Arcane Might: 0 / 50, 2 per level  Set"
"Arcane Shields: 0 / 10, 10 per level (inactive (its system isn't built yet))  Set"
"Arcane Versatility: 0 / 10, 10 per level (inactive (its system isn't built yet))  Set"
"True Wit: 0 / 5, 20 per level (inactive (its system isn't built yet))  Set"
"Spell Focus: 0 / 100, 1 per level  Set"
```
