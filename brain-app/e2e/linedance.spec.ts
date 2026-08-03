import { test, expect } from '@playwright/test';
import { signIn } from './helpers';
test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.route('**/rest/v1/linedance_dances**', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({
          json: [
            {
              id: 'd',
              name: 'Electric Slide',
              song: 'Electric Boogie',
              artist: 'Marcia Griffiths',
              youtube_url: 'https://youtu.be/test',
              counts: 18,
              walls: 4,
              difficulty: 'Anfänger',
              notes: '',
            },
          ],
        })
      : r.fulfill({ status: 201, json: {} }),
  );
  await page.route('**/rest/v1/linedance_steps**', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({
          json: [
            {
              id: '1',
              dance_id: 'd',
              position: 0,
              counts: '1-4',
              instruction: 'Grapevine rechts',
              foot: 'Rechts',
              annotation: 'Gewicht rechts',
            },
            {
              id: '2',
              dance_id: 'd',
              position: 1,
              counts: '5-8',
              instruction: 'Grapevine links',
              foot: 'Links',
              annotation: '',
            },
          ],
        })
      : r.fulfill({ status: 201, json: {} }),
  );
});
test('filters dances and shows complete step labels', async ({ page }) => {
  await page.goto('/linedance');
  await page.getByLabel('Tänze durchsuchen').fill('Boogie');
  await expect(page.getByRole('heading', { name: 'Electric Slide' }).first()).toBeVisible();
  await expect(page.getByText('Grapevine rechts')).toBeVisible();
  await expect(page.getByText(/Gewicht rechts/)).toBeVisible();
  await expect(page.getByTitle('Linedance Video')).toHaveAttribute(
    'src',
    /youtube\.com\/embed\/test/,
  );
});
test('creates and edits compact step rows', async ({ page }) => {
  await page.goto('/linedance');
  await page.getByLabel('Anweisung').fill('Kick');
  await page.getByLabel('Fuß', { exact: true }).selectOption('R');
  await page.getByRole('button', { name: 'Schritt hinzufügen' }).click();
  await page.getByRole('button', { name: 'Bearbeiten' }).last().click();
  await expect(page.getByRole('button', { name: 'Schritt speichern' })).toBeVisible();
});

test('opens and closes the slide-down dance editor', async ({ page }) => {
  await page.goto('/linedance');
  await page.getByRole('button', { name: '+ Tanz' }).click();
  await expect(page.getByLabel('Tanzname')).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(page.getByLabel('Tanzname')).toBeHidden();
});
