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
  await expect(page.getByText(/Rechts.*Gewicht rechts/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Video öffnen/ })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
});
test('creates, edits and reorders steps', async ({ page }) => {
  await page.goto('/linedance');
  await page.getByLabel('Anweisung').fill('Kick');
  await page.getByLabel('Fuß', { exact: true }).selectOption('Rechts');
  await page.getByLabel('Fuß-Annotation').fill('Ferse');
  await page.getByRole('button', { name: 'Hinzufügen' }).click();
  await page.getByRole('button', { name: 'Nach oben' }).nth(1).click();
  await page.getByRole('button', { name: 'Bearbeiten' }).last().click();
  await expect(page.getByRole('button', { name: 'Speichern' }).last()).toBeVisible();
});
