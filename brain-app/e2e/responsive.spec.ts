import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('dashboard and Notes remain usable on mobile', async ({ page }) => {
  await signIn(page);
  await expect(page.locator('.modules')).toHaveCSS('grid-template-columns', /.+/);
  await page.getByRole('link', { name: /Notizen/ }).click();
  await expect(page.getByPlaceholder('Search notes…')).toBeVisible();
  await expect(page.locator('main')).toBeInViewport();
});
