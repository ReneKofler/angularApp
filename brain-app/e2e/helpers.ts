import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, Page } from '@playwright/test';

function credentials(): { email: string; password: string } {
  const values = Object.fromEntries(
    readFileSync(resolve(process.cwd(), '..', '.env'), 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')];
      }),
  );
  if (!values.ORIGINAL_PAGE_USER || !values.ORIGINAL_PAGE_PASSWORD) {
    throw new Error('ORIGINAL_PAGE_USER and ORIGINAL_PAGE_PASSWORD must be configured in ../.env');
  }
  return { email: values.ORIGINAL_PAGE_USER, password: values.ORIGINAL_PAGE_PASSWORD };
}

export async function signIn(page: Page): Promise<void> {
  const { email, password } = credentials();
  await page.goto('/login');
  await page.getByLabel('E-Mail').fill(email);
  await page.getByLabel('Passwort').fill(password);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('BrainApp', { exact: true })).toBeVisible();
}
