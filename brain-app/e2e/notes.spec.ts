import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.goto('/notes');
});

test('loads Notes controls and category data without rendering errors', async ({ page }) => {
  await expect(page.getByPlaceholder('e.g. Work, Personal…')).toBeVisible();
  await expect(page.getByPlaceholder('Search notes…')).toBeVisible();
  await expect(page.getByLabel('Status')).toBeVisible();
  await expect(page.getByLabel('Priority')).toBeVisible();
  await expect(page.locator('.error')).toHaveCount(0);
});

test('opens and closes the note editor from a category when data exists', async ({ page }) => {
  const addButton = page.getByRole('button', { name: 'Add note to category' }).first();
  if (await addButton.count()) {
    await addButton.click();
    await expect(page.getByRole('heading', { name: 'New note' })).toBeVisible();
    await page.getByRole('button', { name: 'Close editor' }).click();
    await expect(page.getByRole('heading', { name: 'New note' })).toHaveCount(0);
  }
});
