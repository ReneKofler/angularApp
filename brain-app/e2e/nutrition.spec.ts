import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => signIn(page));

test('loads the nutrition diary with date, goals, and meal controls', async ({ page }) => {
  await page.goto('/nutrition');
  await expect(page.getByRole('heading', { name: 'Ernährung' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Datum' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Tagesfortschritt' })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Mahlzeit' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ziele' })).toBeVisible();
});

test('opens meal and goal editors without writing data', async ({ page }) => {
  await page.goto('/nutrition');
  await page.getByRole('button', { name: '+ Mahlzeit' }).click();
  await expect(page.getByRole('heading', { name: 'Mahlzeit hinzufügen' })).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await page.getByRole('button', { name: 'Ziele' }).click();
  await expect(page.getByRole('heading', { name: 'Ernährungsziele' })).toBeVisible();
});
