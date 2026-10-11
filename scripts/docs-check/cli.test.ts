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
    [['citations', '--counts']],
    [['citations', '../outside.md']],
    [['budgets', 'extra']],
    [['budgets', '--mask', 'f']],
    [['comments', 'extra']],
    [['comments', '--counts', '--quotations']],
    [['comments', '--mask', 'f']],
    [['comment-proof']],
    [['comment-proof', 'a', 'b']],
    [['comment-proof', 'x', '--counts']],
    [['comment-proof', 'x', '--mask']],
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

  // `citations`, `comments` and `budgets` must not call git: CI's checkout is shallow. With PATH
  // empty and no .git in the tree, a git call would fail the run.
  it('runs citations, comments and budgets with no git on PATH and no .git directory', () => {
    const root = makeTree(TREE)
    for (const mode of ['citations', 'comments', 'budgets']) {
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

describe('the entry file header', () => {
  const source = readFileSync(ENTRY, 'utf8')

  it('names the comment modes and no longer claims to have no dependencies', () => {
    expect(source).not.toMatch(/no dependencies/)
    expect(source).toMatch(/typescript/)
    expect(source).toMatch(/comment-proof/)
    expect(source).toMatch(/\bcomments\b/)
  })

  it('says which modes call git', () => {
    expect(source).toMatch(/citations.*comments.*budgets.*never call git/s)
    expect(readFileSync(join(SCRIPTS, 'docs-check', 'git.ts'), 'utf8')).toMatch(
      /comment-proof.*inventory modes/s,
    )
  })
})

describe('docs-check cli comment modes', () => {
  it('runs comments against --root and fails with file:line', () => {
    const root = makeTree({ 'src/x.ts': '\n// Phase 4 note\nexport const a = 1\n' })
    const result = run(['comments', '--root', root])
    expect(result.code).toBe(1)
    expect(result.lines[0]).toContain('src/x.ts:2: ')
  })

  it('reports --counts and --quotations on a failing tree with exit 0', () => {
    const root = makeTree({ 'src/x.ts': '// Phase 4 note\nexport const a = 1\n' })
    expect(run(['comments', '--counts', '--root', root]).code).toBe(0)
    expect(run(['comments', '--root', root, '--quotations']).code).toBe(0)
  })

  it('runs citations on named files', () => {
    const root = makeTree(TREE)
    expect(run(['citations', 'src/x.ts', '--root', root]).code).toBe(0)
    expect(run(['citations', 'src/none.ts', '--root', root]).code).toBe(2)
  })

  it('exits 1 for comment-proof on a bad revision', () => {
    const root = makeTree(TREE)
    expect(run(['comment-proof', 'nope', '--root', root]).code).toBe(1)
  })
})
