## playback: first beat waits 3000 ms (waiting restored)
   ['Tests  2 failed | 18 passed (20)']
   failing: ['starts playing at fight 1, beat 0, one beat interval from its first beat 8ms', 'the delays: 500 / 167 / 100 ms a beat, none once done 1ms', '|ui-app| src/app/playback.test.ts > speed > the delays: 500 / 167 / 100 ms a beat, none once done', '|ui-app| src/app/playback.test.ts > the first beat > starts playing at fight 1, beat 0, one beat interval from its first beat']
## playback: timerKey without speed
   ['Tests  1 failed | 19 passed (20)']
   failing: ['a speed change while playing changes the key, so the beat is rescheduled 5ms', '|ui-app| src/app/playback.test.ts > timerKey > a speed change while playing changes the key, so the beat is rescheduled']
## followLog: always follow
   ['Tests  4 failed | 5 passed (9)']
   failing: ['holds when scrolled up 12ms', 'the tolerance edge: a gap of exactly the tolerance is at the bottom, one more is not 2ms', 'the tolerance is an input, not a constant of the helper 1ms', 'without a tolerance a fractional scroll position is not at the bottom 2ms', '|ui-app| src/app/followLog.test.ts > isAtBottom > holds when scrolled up', '|ui-app| src/app/followLog.test.ts > isAtBottom > the tolerance edge: a gap of exactly the tolerance is at the bottom, one more is not']
## followLog: never follow
   ['Tests  5 failed | 4 passed (9)']
   failing: ['an empty box, or one that fits its content, is at its bottom 1ms', 'follows at the bottom 13ms', 'the tolerance edge: a gap of exactly the tolerance is at the bottom, one more is not 1ms', 'the tolerance is an input, not a constant of the helper 1ms', 'without a tolerance a fractional scroll position is not at the bottom 1ms', '|ui-app| src/app/followLog.test.ts > isAtBottom > an empty box, or one that fits its content, is at its bottom']
## followLog: no tolerance
   ['Tests  3 failed | 6 passed (9)']
   failing: ['the tolerance edge: a gap of exactly the tolerance is at the bottom, one more is not 6ms', 'the tolerance is an input, not a constant of the helper 1ms', 'without a tolerance a fractional scroll position is not at the bottom 1ms', '|ui-app| src/app/followLog.test.ts > isAtBottom > the tolerance edge: a gap of exactly the tolerance is at the bottom, one more is not', '|ui-app| src/app/followLog.test.ts > isAtBottom > the tolerance is an input, not a constant of the helper', '|ui-app| src/app/followLog.test.ts > isAtBottom > without a tolerance a fractional scroll position is not at the bottom']
## followLog: no reset on fight change/jump
   ['Tests  2 failed | 7 passed (9)']
   failing: ['a different fight resets 7ms', 'the same fight with fewer beats shown (a jump to it) resets 1ms', '|ui-app| src/app/followLog.test.ts > shouldResetFollow > a different fight resets', '|ui-app| src/app/followLog.test.ts > shouldResetFollow > the same fight with fewer beats shown (a jump to it) resets']
## soulRows: trait names instead of descriptions
   ['Tests  2 failed | 8 passed (10)']
   failing: ['a creature with two traits lists them in its template’s order 4ms', 'a real creature’s trait lines are its template’s trait descriptions, not names 13ms', '|ui-app| src/app/soulRows.test.ts > soulRows > a creature with two traits lists them in its template’s order', '|ui-app| src/app/soulRows.test.ts > soulRows > a real creature’s trait lines are its template’s trait descriptions, not names']
## soulRows: wrong trait order
   ['Tests  1 failed | 9 passed (10)']
   failing: ['a creature with two traits lists them in its template’s order 10ms', '|ui-app| src/app/soulRows.test.ts > soulRows > a creature with two traits lists them in its template’s order']
## soulRows: silent fallback on a missing template
   ['Tests  3 failed | 16 passed (19)']
   failing: ['a creature with no template throws 10ms', 'a miss throws rather than falling back to an id 6ms', 'throws on an id with no template 1ms', '|ui-app| src/app/creatureLine.test.ts > creatureLine > a miss throws rather than falling back to an id', '|ui-app| src/app/creatureLine.test.ts > templateOf > throws on an id with no template', '|ui-app| src/app/soulRows.test.ts > soulRows > a creature with no template throws']
## perkRows: description dropped for inactive perks
   ['Tests  2 failed | 11 passed (13)']
   failing: ['an inactive perk carries one too 1ms', 'every row of every spec carries its perk’s description 6ms', '|ui-app| src/app/perkRows.test.ts > the description > an inactive perk carries one too', '|ui-app| src/app/perkRows.test.ts > the description > every row of every spec carries its perk’s description']
## traitDescription: fallback instead of throw
   ['Tests  1 failed | 8 passed (9)']
   failing: ['throws on an unknown id and on a fixture trait’s id 10ms', '|engine-data-state| src/data/descriptions.test.ts > traitDescription > throws on an unknown id and on a fixture trait’s id']
## perkDescription: fallback instead of throw
   ['Tests  1 failed | 8 passed (9)']
   failing: ['throws on an unknown id 9ms', '|engine-data-state| src/data/descriptions.test.ts > perkDescription > throws on an unknown id']
## data: a blank trait description
   ['Tests  1 failed | 8 passed (9)']
   failing: ['every trait description is non-blank with no Markdown left 6ms', '|engine-data-state| src/data/descriptions.test.ts > the shipped text > every trait description is non-blank with no Markdown left']
## data: leftover Markdown in a perk
   ['Tests  2 failed | 7 passed (9)']
   failing: ['every perk description is non-blank with no Markdown left 2ms', 'returns the description of a known perk 10ms', '|engine-data-state| src/data/descriptions.test.ts > perkDescription > returns the description of a known perk', '|engine-data-state| src/data/descriptions.test.ts > the shipped text > every perk description is non-blank with no Markdown left']
## data: duplicate perk id across specs
   ['Tests  2 failed | 7 passed (9)']
   failing: ['perk ids are unique across the specializations 3ms', 'returns the description of a known perk 12ms', '|engine-data-state| src/data/descriptions.test.ts > perkDescription > returns the description of a known perk', '|engine-data-state| src/data/descriptions.test.ts > the shipped text > perk ids are unique across the specializations']
