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
  await expect(page.getByRole('link', { name: /Ernährung/ })).toHaveAttribute('href', '/nutrition');
  await expect(page.getByRole('link', { name: /Rezepte/ })).toHaveAttribute('href', '/recipes');
  await expect(page.locator('.module.unavailable')).toHaveCount(13);
});

test('opens dashboard settings with reorder, visibility, and color controls', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Einstellungen' });
  await expect(dialog).toBeVisible();
  const rows = dialog.locator('.settings-row');
  await expect(rows).toHaveCount(21);
  await expect(rows.first().locator('input[type="color"]')).toBeAttached();
  await expect(rows.first().getByRole('button', { name: /ausblenden/ })).toBeVisible();
  await dialog.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(dialog).toBeHidden();
});

test('opens profile and shows account and global tile settings', async ({ page }) => {
  await page.getByRole('link', { name: 'Profile' }).click();
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'E-Mail-Adresse' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dashboard-Kacheln' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Einheitlich dunkel/ })).toBeVisible();
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
