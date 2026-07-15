import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { LoginPage } from './pages/login.page';

test.describe('authentication entry point', () => {
  test('redirects protected routes to login and preserves the destination', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fsettings$/);
    await expect(page.getByRole('heading', { name: 'Sign in to BrainApp' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('does not expose public signup', async ({ page }) => {
    await new LoginPage(page).open();
    await expect(page.getByRole('link', { name: /sign up|register|create account/i })).toHaveCount(
      0,
    );
  });

  test('has no serious accessibility violations', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });

  test('fits the viewport without horizontal overflow', async ({ page }) => {
    await page.goto('/login');
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });

  test('applies the saved dark theme before rendering', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('brainapp-theme', 'dark'));
    await page.goto('/login');
    await page.addStyleTag({ content: '.notice { display: none !important; }' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page).toHaveScreenshot('login-dark.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });
});
