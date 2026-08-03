import { expect, test } from '@playwright/test';

test('login visual baseline remains stable', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveScreenshot('login-page.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.03,
  });
});
