import { test, expect } from '@playwright/test';
import { signIn } from './helpers';
test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.route('**/rest/v1/ranking_categories**', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({
          json: [
            {
              id: 'c',
              name: 'Filme',
              icon: '🎬',
              color: 'from-amber-500 to-amber-600',
              position: 0,
              view_mode: 'grid',
              show_year: true,
              show_image_url: true,
              show_episodes: true,
            },
          ],
        })
      : r.fulfill({ status: 201, json: {} }),
  );
  await page.route('**/rest/v1/rankings**', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({
          json: [
            {
              id: 'r',
              category_id: 'c',
              name: 'Film A',
              rating: 8,
              status: 'Geplant',
              episodes: 10,
              watched_episodes: 4,
            },
          ],
        })
      : r.fulfill({ status: 201, json: {} }),
  );
  await page.route('**/rest/v1/ranking_consumed_dates**', (r) =>
    r.request().method() === 'GET' ? r.fulfill({ json: [] }) : r.fulfill({ status: 201, json: {} }),
  );
});
test('opens a category, filters rankings and opens its editor', async ({ page }) => {
  await page.goto('/rankings');
  const categoryTile = page.getByRole('button', { name: 'Filme öffnen' });
  await expect(categoryTile).toBeVisible();
  await expect(categoryTile).toHaveCSS('background-image', /linear-gradient/);
  await categoryTile.focus();
  await expect(page.getByRole('button', { name: 'Filme bearbeiten' })).toHaveCSS('opacity', '1');
  await categoryTile.click();
  await expect(page.getByText('Film A')).toBeVisible();
  await page.getByRole('button', { name: 'Kategorie bearbeiten' }).click();
  await expect(page.getByRole('heading', { name: 'Kategorie bearbeiten' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Farbe 1', exact: true })).toBeVisible();
  await expect(page.getByText('Sichtbare Felder')).toBeVisible();
  await page.getByRole('button', { name: 'Schließen' }).click();
  await page.getByLabel('Rankings durchsuchen').fill('fehlt');
  await expect(page.getByText('Keine Einträge gefunden.')).toBeVisible();
  await page.getByRole('button', { name: '+ Ranking' }).click();
  await expect(page.getByLabel('Jahr')).toBeVisible();
  await expect(page.getByLabel('Folgen')).toBeVisible();
});
test('opens category settings and exposes reorder controls', async ({ page }) => {
  await page.goto('/rankings');
  await page.getByRole('button', { name: 'Einstellungen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nach oben' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nach unten' })).toBeVisible();
});
test('edits a focused tile without leaving the category overview', async ({ page }) => {
  await page.goto('/rankings');
  const tile = page.getByRole('button', { name: 'Filme öffnen' });
  await tile.focus();
  await page.getByRole('button', { name: 'Filme bearbeiten' }).click();
  await expect(page.getByRole('heading', { name: 'Kategorie bearbeiten' })).toBeVisible();
  await expect(page.locator('header').getByRole('heading', { name: 'Rankings' })).toBeVisible();
  await expect(page.getByLabel('Rankings durchsuchen')).toHaveCount(0);
});
