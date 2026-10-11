import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import { main } from './cli.ts'
import { capture, cleanUp, makeTree } from './test-utils.ts'

afterAll(cleanUp)

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRY = join(SCRIPTS, 'docs-check.ts')

const TREE = {
  '.claude/spec/combat.md': '# Spec\n\n### Provoke\n',
  '.claude/workflow/budgets.md':
    '| File | Budget (KB) |\n| --- | --- |\n| `spec/combat.md` | 1 |\n',
  'src/x.ts': '// see `spec/combat.md#provoke`\n',
}

function run(argv: string[], root = '/unused') {
  const out = capture()
  const code = main(argv, root, out.io)
  return { code, lines: out.lines, errors: out.errors }
}

describe('docs-check cli', () => {
  it('runs citations and budgets against --root, from any cwd', () => {
    const root = makeTree(TREE)
    expect(run(['citations', '--root', root]).code).toBe(0)
    expect(run(['--root', root, 'budgets']).code).toBe(0)
    expect(
      run(['citations', '--root', makeTree({ 'src/x.ts': '// GAME_DESIGN §4\n' })]).code,
    ).toBe(1)
  })

  it('uses the default root when --root is absent', () => {
    expect(run(['citations'], makeTree(TREE)).lines.at(-1)).toMatch(/^citations: PASS/)
  })

  it.each([['move'], ['line-proof'], ['frobnicate'], []])(
    'rejects the mode %s with usage and exit 2',
    (...argv) => {
      const { code, errors } = run(argv)
      expect(code).toBe(2)
      expect(errors.join('\n')).toContain('usage: npm run docs:check')
      expect(errors.join('\n')).not.toContain('Phase 4.2')
    },
  )

  it.each([
    [['citations', 'extra']],
    [['budgets', 'extra']],
    [['inventory']],
    [['inventory', 'a', 'b']],
    [['inventory-skeleton', 'mailbox']],
    [['citations', '--base', 'HEAD']],
    [['citations', '--nope']],
    [['citations', '--root']],
  ])('rejects bad arguments %j with exit 2', (argv) => {
    expect(run(argv).code).toBe(2)
  })

  it('exits 1 on a tool error, not 2', () => {
    const root = makeTree(TREE)
    expect(run(['inventory', '.claude/phases/none', '--root', root]).code).toBe(1)
  })

  // `citations` and `budgets` must not call git: CI's checkout is shallow. With PATH empty and no
  // .git in the tree, a git call would fail the run.
  it('runs citations and budgets with no git on PATH and no .git directory', () => {
    const root = makeTree(TREE)
    for (const mode of ['citations', 'budgets']) {
      const result = spawnSync(process.execPath, [ENTRY, mode, '--root', root], {
        env: { PATH: '' },
        encoding: 'utf8',
      })
      expect(result.status, result.stderr).toBe(0)
    }
  })

  it('fails the real entry on a planted fault, with file:line', () => {
    const root = makeTree({ ...TREE, 'src/y.ts': '\n// see CONVENTIONS "Testing"\n' })
    const result = spawnSync(process.execPath, [ENTRY, 'citations', '--root', root], {
      env: { PATH: '' },
      encoding: 'utf8',
    })
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('src/y.ts:2: ')
  })
})

describe('the Phase 4.2 modes are gone', () => {
  const source = readFileSync(ENTRY, 'utf8')

  it('the entry names no Phase 4.2 mode', () => {
    expect(source).not.toMatch(/Phase 4\.2|line-proof|runMove/)
  })
})
