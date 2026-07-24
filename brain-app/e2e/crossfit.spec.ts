import { expect, Page, test } from '@playwright/test';
import { signIn } from './helpers';

const library = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: '22222222-2222-2222-2222-222222222222',
  name: '5 Rounds: Cal / Sit-ups',
  crossfit_type: 'for_time',
  exercises: ['Row', 'Situps'],
  time_cap: 18,
  rounds: 5,
  work_minutes: null,
  rest_minutes: null,
  is_favourite: true,
  description: null,
  amrap_duration: null,
  is_hero: false,
  is_girl: false,
  is_open: false,
  total_reps: 150,
  is_partner: false,
  crossfit_focus: 'conditioning',
};

const log = {
  id: '33333333-3333-3333-3333-333333333333',
  user_id: '22222222-2222-2222-2222-222222222222',
  workout_type: 'crossfit',
  workout_date: '2026-07-23',
  workout_name: library.name,
  crossfit_type: 'for_time',
  crossfit_description: 'Conditioning',
  description: 'Rudergerät',
  exercises: library.exercises,
  time_cap: 18,
  rounds: 5,
  work_minutes: null,
  rest_minutes: null,
  duration: null,
  result_rounds: null,
  total_reps: 150,
  dnf: true,
  missing_reps: 44,
  is_hero: false,
  is_girl: false,
  is_open: false,
  is_partner: false,
  done_alone: null,
  notes: null,
};

async function mockCrossfit(page: Page) {
  await page.route('**/rest/v1/workouts_library**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([library]),
    }),
  );
  await page.route(/\/rest\/v1\/workouts\?.*workout_type/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([log]) }),
  );
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await mockCrossfit(page);
  await page.goto('/crossfit');
});

test('matches the original Sports layout and renders DNF results', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'CrossFit' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sports' })).toHaveClass(/active/);
  await expect(page.getByRole('button', { name: 'Workouts' })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Sport' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Letzte Einheiten' })).toBeVisible();
  await expect(page.getByLabel('Sports sortieren')).toHaveValue('newest');
  await expect(page.getByText('DNF · 44 Reps fehlen')).toBeVisible();
});

test('filters recent sessions by type, focus, equipment, and search', async ({ page }) => {
  await page.getByRole('button', { name: 'FOR_TIME' }).click();
  await page.getByRole('button', { name: 'Conditioning' }).click();
  await page.getByRole('button', { name: /Rudergerät/ }).click();
  await page.getByLabel('Sports suchen').fill('Sit-ups');
  await expect(page.getByRole('heading', { name: library.name })).toBeVisible();

  await page.getByLabel('Sports suchen').fill('nicht vorhanden');
  await expect(page.getByText('Keine Einheiten gefunden.')).toBeVisible();
});

test('opens a library workout as a prefilled result form', async ({ page }) => {
  await page.getByRole('button', { name: 'Workouts' }).click();
  await expect(page.getByRole('heading', { name: 'Workout-Bibliothek' })).toBeVisible();
  await expect(page.getByRole('heading', { name: library.name })).toBeVisible();
  await page.getByRole('button', { name: 'Ergebnis eintragen' }).click();
  await expect(page.locator('form').getByRole('heading', { name: library.name })).toBeVisible();
  await expect(page.getByLabel('Datum')).toBeVisible();
  await expect(page.getByText('DNF', { exact: true })).toBeVisible();
});
