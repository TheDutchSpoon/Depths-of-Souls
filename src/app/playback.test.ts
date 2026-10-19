import { describe, expect, test } from 'vitest'
import {
  initialPlayback,
  pendingDelayMs,
  playbackReducer,
  SPEEDS,
  timerKey,
} from './playback'
import type { PlaybackAction, PlaybackState } from './playback'

// Three fights of 2, 3 and 1 beats.
const counts = [2, 3, 1]
const step = (state: PlaybackState, action: PlaybackAction) =>
  playbackReducer(state, action, counts)
const elapsed: PlaybackAction = { type: 'timer-elapsed' }

const playing = (
  fight: number,
  revealed: number,
  speed: 1 | 3 | 5 = 1,
): PlaybackState => ({
  phase: 'playing',
  fight,
  revealed,
  speed,
})

describe('the first beat', () => {
  test('starts playing at fight 1, beat 0, one beat interval from its first beat', () => {
    expect(initialPlayback()).toEqual(playing(0, 0))
    expect(pendingDelayMs(initialPlayback())).toBe(SPEEDS[1])
  })

  test('a jump from the start plays that fight from its first beat', () => {
    expect(step(initialPlayback(), { type: 'jump', fight: 2 })).toEqual(playing(2, 0))
  })
})

describe('the timer', () => {
  test('reveals a beat at a time, then runs on into the next fight', () => {
    expect(step(playing(0, 0), elapsed)).toEqual(playing(0, 1))
    expect(step(playing(0, 1), elapsed)).toEqual(playing(0, 2))
    expect(step(playing(0, 2), elapsed)).toEqual(playing(1, 0))
  })

  test('stops at the floor’s last beat', () => {
    expect(step(playing(2, 0), elapsed)).toEqual({
      phase: 'done',
      fight: 2,
      revealed: 1,
      speed: 1,
    })
  })

  test('a timer firing once done returns the identical state', () => {
    const done = step(playing(2, 0), elapsed)
    expect(step(done, elapsed)).toBe(done)
  })
})

describe('skips and jumps', () => {
  test('skip to end of fight lands on its last beat and carries on', () => {
    expect(step(playing(1, 1), { type: 'skip-fight' })).toEqual(playing(1, 3))
    expect(step(step(playing(1, 1), { type: 'skip-fight' }), elapsed)).toEqual(
      playing(2, 0),
    )
  })

  test('skip to end of fight on the last fight is the end of the floor', () => {
    expect(step(playing(2, 0), { type: 'skip-fight' })).toEqual({
      phase: 'done',
      fight: 2,
      revealed: 1,
      speed: 1,
    })
  })

  test('skip to end of floor shows the last fight fully and stops', () => {
    expect(step(playing(0, 1), { type: 'skip-floor' })).toEqual({
      phase: 'done',
      fight: 2,
      revealed: 1,
      speed: 1,
    })
    expect(step(initialPlayback(), { type: 'skip-floor' }).phase).toBe('done')
  })

  test('a jump after the end restarts playback, which then runs on', () => {
    const done = step(playing(0, 0), { type: 'skip-floor' })
    const jumped = step(done, { type: 'jump', fight: 1 })
    expect(jumped).toEqual(playing(1, 0))
    expect(pendingDelayMs(jumped)).toBe(SPEEDS[1])
  })

  test('a jump to a fight that does not exist throws', () => {
    expect(() => step(playing(0, 0), { type: 'jump', fight: 3 })).toThrow(RangeError)
    expect(() => step(playing(0, 0), { type: 'jump', fight: -1 })).toThrow(RangeError)
  })
})

describe('speed', () => {
  test('a speed change keeps the position', () => {
    expect(step(playing(1, 2), { type: 'set-speed', speed: 5 })).toEqual(playing(1, 2, 5))
  })

  test('the delays: 500 / 167 / 100 ms a beat, none once done', () => {
    expect(pendingDelayMs(playing(0, 0, 1))).toBe(500)
    expect(pendingDelayMs(playing(0, 0, 3))).toBe(167)
    expect(pendingDelayMs(playing(0, 0, 5))).toBe(100)
    expect(pendingDelayMs(step(playing(2, 0), elapsed))).toBeNull()
  })
})

describe('an action that changes nothing returns the identical object', () => {
  const cases: [string, PlaybackState, PlaybackAction][] = [
    ['the current speed again', playing(1, 1), { type: 'set-speed', speed: 1 }],
    [
      'skip-fight when done',
      step(playing(0, 0), { type: 'skip-floor' }),
      { type: 'skip-fight' },
    ],
    ['jump to the current position', playing(1, 0), { type: 'jump', fight: 1 }],
    [
      'skip-floor when already there',
      step(playing(0, 0), { type: 'skip-floor' }),
      { type: 'skip-floor' },
    ],
    ['skip-fight on a fight already fully shown', playing(0, 2), { type: 'skip-fight' }],
  ]
  test.each(cases)('%s', (_title, state, action) => {
    expect(step(state, action)).toBe(state)
  })
})

describe('timerKey', () => {
  test('a speed change while playing changes the key, so the beat is rescheduled', () => {
    const state = playing(0, 1)
    expect(timerKey(step(state, { type: 'set-speed', speed: 3 }))).not.toBe(
      timerKey(state),
    )
  })

  test('every move of the position changes the key', () => {
    const keys = [
      timerKey(playing(0, 0)),
      timerKey(playing(0, 1)),
      timerKey(playing(1, 0)),
      timerKey(step(playing(0, 0), { type: 'skip-floor' })),
    ]
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('is a string of the position, not the state object', () => {
    expect(typeof timerKey(playing(0, 0))).toBe('string')
    expect(timerKey({ ...playing(0, 0) })).toBe(timerKey(playing(0, 0)))
  })
})

describe('a descent with no fights', () => {
  const none: readonly number[] = []
  const actions: PlaybackAction[] = [
    { type: 'timer-elapsed' },
    { type: 'skip-fight' },
    { type: 'skip-floor' },
    { type: 'jump', fight: 0 },
  ]

  test('starts done, with nothing pending', () => {
    const state = initialPlayback(0)
    expect(state).toEqual({ phase: 'done', fight: 0, revealed: 0, speed: 1 })
    expect(pendingDelayMs(state)).toBeNull()
  })

  test('a descent with a fight still starts playing', () => {
    expect(initialPlayback(1).phase).toBe('playing')
    expect(initialPlayback(3).phase).toBe('playing')
  })

  test.each(actions)(
    '$type returns the identical state, with no NaN or undefined position',
    (action) => {
      const state = initialPlayback(0)
      const next = playbackReducer(state, action, none)
      expect(next).toBe(state)
      expect(Number.isInteger(next.fight)).toBe(true)
      expect(Number.isInteger(next.revealed)).toBe(true)
    },
  )

  test('a speed change still changes the speed', () => {
    const next = playbackReducer(
      initialPlayback(0),
      { type: 'set-speed', speed: 3 },
      none,
    )
    expect(next).toEqual({ phase: 'done', fight: 0, revealed: 0, speed: 3 })
  })
})
