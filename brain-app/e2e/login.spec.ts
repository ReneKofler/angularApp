import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('signs in through the German login form and signs out', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  await expect(page.getByLabel('E-Mail')).toBeVisible();
  await expect(page.getByLabel('Passwort')).toBeVisible();

  await signIn(page);
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
});
