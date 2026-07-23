import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.goto('/workouts');
});

test('loads workout search, filters, and real endpoint data', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Sport Tracking' })).toBeVisible();
  await expect(page.getByPlaceholder('Suchen …')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Alle' })).toBeVisible();
  await expect(page.locator('.error')).toHaveCount(0);
});

test('switches into inline sport capture and cancels', async ({ page }) => {
  await page.getByRole('button', { name: '+ Sport' }).click();
  await expect(page.getByRole('heading', { name: 'Sport erfassen' })).toBeVisible();
  await expect(page.getByText('Workout-Typ')).toBeVisible();
  await expect(page.getByRole('button', { name: /Running/ })).toHaveClass(/selected/);
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(page.getByRole('heading', { name: 'Letzte Einheiten' })).toBeVisible();
});

test('opens and closes custom sport management', async ({ page }) => {
  await page.getByRole('button', { name: 'Sportarten verwalten' }).click();
  await expect(page.getByRole('heading', { name: 'Sportarten verwalten' })).toBeVisible();
  await expect(page.getByText('Neue Sportart')).toBeVisible();
  await expect(page.getByLabel('Name')).toBeVisible();
  await page.getByRole('button', { name: 'Schließen' }).click();
  await expect(page.getByRole('heading', { name: 'Sportarten verwalten' })).toHaveCount(0);
});
