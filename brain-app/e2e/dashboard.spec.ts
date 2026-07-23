import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => signIn(page));

test('shows the complete module grid and working modules', async ({ page }) => {
  await expect(page.locator('.module')).toHaveCount(20);
  await expect(page.getByRole('link', { name: /Sport Tracking/ })).toHaveAttribute('href', '/workouts');
  await expect(page.getByRole('link', { name: /Notizen/ })).toHaveAttribute('href', '/notes');
  await expect(page.locator('.module.unavailable')).toHaveCount(18);
});

test('navigates to Notes and back to the dashboard', async ({ page }) => {
  await page.getByRole('link', { name: /Notizen/ }).click();
  await expect(page).toHaveURL(/\/notes/);
  await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to dashboard' }).click();
  await expect(page).toHaveURL(/\/$/);
});
