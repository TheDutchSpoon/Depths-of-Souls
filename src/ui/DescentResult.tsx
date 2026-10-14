import type { FightRow } from '../app/fightList'

interface DescentResultProps {
  readonly floorLine: string
  readonly bossLine: string | null
  readonly rows: readonly FightRow[]
  readonly onJump: (fight: number) => void
  readonly onCopy: (fight: number) => void
}

/** The result of a descent and its fight list, a child of the viewer that owns playback: a row's
 * Jump button dispatches into the viewer's reducer. */
export function DescentResult({
  floorLine,
  bossLine,
  rows,
  onJump,
  onCopy,
}: DescentResultProps) {
  return (
    <div>
      <p>{floorLine}</p>
      {bossLine !== null && <p>{bossLine}</p>}
      <table>
        <thead>
          <tr>
            <th>Fight</th>
            <th>Result</th>
            <th>Rounds</th>
            <th>Kills</th>
            <th>XP</th>
            <th>Level-ups</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.number}>
              <td>{row.number}</td>
              <td>{row.result}</td>
              <td>{row.rounds}</td>
              <td>{row.kills}</td>
              <td>{row.xp}</td>
              <td>{row.levelUps.join('; ')}</td>
              <td>
                <button type="button" onClick={() => onJump(index)}>
                  Jump to fight {row.number}
                </button>{' '}
                <button type="button" onClick={() => onCopy(index)}>
                  Debug: Copy fight {row.number} as JSON
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
