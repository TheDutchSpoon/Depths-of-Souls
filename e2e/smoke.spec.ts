import { expect, test } from '@playwright/test'

// Asserts no fight outcome, so a balance change never breaks it.
test('start as Brute, descend floor 1, see the result, the side panel and the party', async ({
  page,
}) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))

  await page.goto('./')

  await page.getByLabel('Brute').check()
  await page.getByLabel(/^Seed/).fill('10')
  await page.getByRole('button', { name: 'Start' }).click()

  await page.getByLabel('Floor:').fill('1')
  await page.getByRole('button', { name: 'Descend', exact: true }).click()

  await expect(page.getByText(/^Floor 1:/)).toBeVisible()

  await expect(page.getByRole('complementary')).toContainText(/Last floor\s*1(?!\d)/)

  await expect(page.getByLabel('Party slot 1')).not.toHaveValue('')
  await expect(page.getByLabel('Party slot 2')).not.toHaveValue('')
  await expect(page.getByLabel('Party slot 3')).toHaveValue('')

  expect(pageErrors).toEqual([])
})
