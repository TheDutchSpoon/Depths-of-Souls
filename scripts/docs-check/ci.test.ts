import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const WORKFLOW = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../.github/workflows/deploy.yml',
)

/** The text of the `test:` job, up to the next top-level job. */
function testJob(): string {
  const text = readFileSync(WORKFLOW, 'utf8')
  const start = text.indexOf('\n  test:\n')
  const next = text.slice(start + 1).search(/\n {2}[a-z]+:\n/)
  return text.slice(start, next < 0 ? undefined : start + 1 + next)
}

describe('CI runs the docs checks', () => {
  it('the test job runs citations, budgets and comments', () => {
    const job = testJob()
    expect(job).toContain('- run: npm run docs:check -- citations')
    expect(job).toContain('- run: npm run docs:check -- budgets')
    expect(job).toContain('- run: npm run docs:check -- comments')
  })

  it('runs them before the test step', () => {
    const job = testJob()
    expect(job.indexOf('docs:check -- citations')).toBeLessThan(
      job.indexOf('- run: npm run test'),
    )
    expect(job.indexOf('docs:check -- budgets')).toBeLessThan(
      job.indexOf('docs:check -- comments'),
    )
    expect(job.indexOf('docs:check -- comments')).toBeLessThan(
      job.indexOf('- run: npm run test'),
    )
  })
})
