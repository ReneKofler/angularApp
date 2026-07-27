import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => signIn(page));

test('shows the complete module grid and working modules', async ({ page }) => {
  await expect(page.locator('.module')).toHaveCount(21);
  await expect(page.getByRole('link', { name: /Sport Tracking/ })).toHaveAttribute('href', '/workouts');
  await expect(page.getByRole('link', { name: /CrossFit/ })).toHaveAttribute('href', '/crossfit');
  await expect(page.getByRole('link', { name: /Notizen/ })).toHaveAttribute('href', '/notes');
  await expect(page.getByRole('link', { name: /Übungen/ })).toHaveAttribute('href', '/training');
  await expect(page.getByRole('link', { name: /Greasing the Groove/ })).toHaveAttribute(
    'href',
    '/greasing-the-groove',
  );
  await expect(page.locator('.module.unavailable')).toHaveCount(16);
});

test('navigates to Greasing the Groove and back to the dashboard', async ({ page }) => {
  await page.getByRole('link', { name: /Greasing the Groove/ }).click();
  await expect(page).toHaveURL(/\/greasing-the-groove/);
  await expect(page.getByRole('heading', { name: 'Greasing the Groove' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Trainingstag' })).toBeVisible();
  await page.getByRole('link', { name: 'Zurück' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('navigates to Notes and back to the dashboard', async ({ page }) => {
  await page.getByRole('link', { name: /Notizen/ }).click();
  await expect(page).toHaveURL(/\/notes/);
  await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to dashboard' }).click();
  await expect(page).toHaveURL(/\/$/);
});
