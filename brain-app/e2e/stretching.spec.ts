import { test, expect } from '@playwright/test';
import { signIn } from './helpers';
test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.route('**/rest/v1/stretching_routines**', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({ json: [{ id: 'r', name: 'Morgenroutine', emoji: '🧘', description: '' }] })
      : r.fulfill({ status: 201, json: {} }),
  );
  await page.route('**/rest/v1/stretching_exercises**', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({
          json: [
            {
              id: '1',
              routine_id: 'r',
              name: 'Nacken',
              emoji: '🙆',
              duration_seconds: 30,
              notes: 'Langsam dehnen',
              image_url: 'https://invalid.test/broken.jpg',
              position: 0,
            },
            {
              id: '2',
              routine_id: 'r',
              name: 'Schulter',
              emoji: '🤸',
              duration_seconds: 45,
              notes: '',
              image_url: '',
              position: 1,
            },
          ],
        })
      : r.fulfill({ status: 201, json: {} }),
  );
});
test('creates, orders and edits stretching exercises', async ({ page }) => {
  await page.goto('/stretching');
  await expect(page.getByRole('heading', { name: 'Morgenroutine' })).toBeVisible();
  await page.getByLabel('Name').fill('Hüfte');
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click();
  await page.getByRole('button', { name: 'Nach oben' }).nth(1).click();
  await page.getByRole('button', { name: 'Bearbeiten' }).first().click();
  await expect(page.getByRole('button', { name: 'Speichern' })).toBeVisible();
});
test('guides timing, handles broken media and interruption', async ({ page }) => {
  await page.goto('/stretching');
  await page.getByRole('button', { name: 'Routine starten' }).click();
  await expect(page.getByText('30 s')).toBeVisible();
  await expect(page.getByText('Bild nicht verfügbar')).toBeVisible();
  await page.getByRole('button', { name: 'Timer starten' }).click();
  await page.getByRole('button', { name: 'Weiter →' }).click();
  await expect(page.getByText('45 s')).toBeVisible();
  await page.getByRole('button', { name: 'Routine beenden' }).click();
  await expect(page.getByRole('heading', { name: 'Stretching' })).toBeVisible();
});
