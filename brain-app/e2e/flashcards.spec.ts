import { test, expect } from '@playwright/test';
import { signIn } from './helpers';
test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.route('**/rest/v1/flashcard_categories**', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({ json: [{ id: 'c', name: 'Deutsch' }] })
      : r.fulfill({ status: 201, json: {} }),
  );
  await page.route('**/rest/v1/flashcards**', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({
          json: [
            { id: '1', category_id: 'c', title: 'Begrüßung', front: 'Hallo', back: 'Hello' },
            { id: '2', category_id: 'c', title: 'Abschied', front: 'Tschüss', back: 'Bye' },
          ],
        })
      : r.fulfill({ status: 201, json: {} }),
  );
});
test('filters cards and studies with reveal and keyboard navigation', async ({ page }) => {
  await page.goto('/flashcards');
  await page.getByRole('button', { name: /Deutsch/ }).click();
  await page.getByLabel('Karten durchsuchen').fill('Begrüßung');
  await expect(page.getByText('Hallo')).toBeVisible();
  await page.getByLabel('Karten durchsuchen').fill('');
  await page.getByRole('button', { name: 'Lernen starten' }).click();
  const dialog = page.getByRole('dialog', { name: 'Lernmodus' });
  await expect(dialog.getByText('Hallo')).toBeVisible();
  await dialog.press(' ');
  await expect(dialog.getByText('Hello')).toBeVisible();
  await dialog.press('ArrowRight');
  await expect(dialog.getByText('Tschüss')).toBeVisible();
});
test('shows inline category and card controls', async ({ page }) => {
  await page.goto('/flashcards');
  await expect(page.getByLabel('Kategoriename')).toBeVisible();
  await page.getByRole('button', { name: /Deutsch/ }).click();
  await expect(page.getByLabel('Vorderseite')).toBeVisible();
  await expect(page.getByLabel('Rückseite')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Karte hinzufügen' })).toBeVisible();
});
