import { expect, test } from '@playwright/test';
import { LoginPage } from './pages/login.page';

const email = process.env['E2E_EMAIL'];
const password = process.env['E2E_PASSWORD'];

test.describe('authenticated application', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!email || !password, 'No dedicated E2E test account configured');

  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.signIn(email!, password!);
    await expect(page).toHaveURL('/');
  });

  test('restores the session and opens the dashboard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Good/ })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Everything, within reach')).toBeVisible();
  });

  test('persists a theme preference and restores the original value', async ({ page }) => {
    await page.getByRole('link', { name: 'Open profile and settings' }).click();
    await expect(page).toHaveURL('/settings');
    const theme = page.getByLabel('Theme');
    const original = await theme.inputValue();
    const replacement = original === 'dark' ? 'light' : 'dark';

    try {
      await theme.selectOption(replacement);
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByText('Settings saved.')).toBeVisible();
      await page.reload();
      await expect(theme).toHaveValue(replacement);
    } finally {
      await theme.selectOption(original);
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByText('Settings saved.')).toBeVisible();
    }
  });

  test('logs out and protects the dashboard', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/login');
    await page.goto('/');
    await expect(page).toHaveURL(/\/login\?redirect=%2F$/);
  });
});
