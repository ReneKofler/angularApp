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
  avg_heart_rate: 150,
  is_hero: false,
  is_girl: false,
  is_open: false,
  is_partner: false,
  done_alone: null,
  notes: null,
};

const exercises = [
  { id: 'exercise-1', name: 'Bench Press', has_1rm: true },
  { id: 'exercise-2', name: 'Row', has_1rm: false },
];
const records = [
  {
    id: 'record-1',
    user_id: '22222222-2222-2222-2222-222222222222',
    record_name: 'Bench Press',
    value: '72.5',
    unit: 'kg',
    record_date: '2026-01-29',
  },
];

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
  await page.route('**/rest/v1/exercises**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(exercises),
    }),
  );
  await page.route('**/rest/v1/personal_records**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(records) }),
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
  await page.getByLabel('Fokus').getByRole('button', { name: 'Conditioning' }).click();
  await page
    .getByLabel('Equipment')
    .getByRole('button', { name: /Rudergerät/ })
    .click();
  await page.getByLabel('Sports suchen').fill('Sit-ups');
  await expect(page.getByRole('heading', { name: library.name })).toBeVisible();

  await page.getByLabel('Sports suchen').fill('nicht vorhanden');
  await expect(page.getByText('Keine Einheiten gefunden.')).toBeVisible();
});

test('+ Sport opens capture without changing tabs', async ({ page }) => {
  await page.getByRole('button', { name: '+ Sport' }).click();
  await expect(page.getByRole('button', { name: 'Sports' })).toHaveClass(/active/);
  const capture = page.locator('main form.capture-form');
  await expect(capture.getByRole('heading', { name: 'Sport erfassen' })).toBeVisible();
  await expect(page.locator('.backdrop')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Abbrechen' })).toBeVisible();
  await expect(page.getByLabel('Workout wählen')).toBeVisible();
  await expect(page.getByLabel('Ø Herzfrequenz (bpm) - optional')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sport speichern' })).toBeDisabled();
});

test('opens a recent-session tile for editing with delete inside the dialog', async ({ page }) => {
  const tile = page.getByRole('button', { name: /5 Rounds: Cal \/ Sit-ups/ });
  await expect(page.getByRole('button', { name: 'Einheit löschen' })).toHaveCount(0);
  await tile.click();
  await expect(page.locator('form').getByRole('heading', { name: library.name })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Löschen', exact: true })).toBeVisible();
  await expect(page.getByLabel('Workout wählen')).toHaveValue(library.id);
});

test('matches the Workouts layout and edits tiles inline', async ({ page }) => {
  await page.getByRole('button', { name: 'Workouts' }).click();
  await expect(page.getByRole('heading', { name: 'Workouts', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Workout' })).toBeVisible();
  await expect(page.getByLabel('Workouts sortieren')).toHaveValue('newest');
  await expect(page.getByRole('heading', { name: library.name })).toBeVisible();
  await page.getByRole('button', { name: /5 Rounds: Cal \/ Sit-ups/ }).click();
  const form = page.locator('main form.library-capture');
  await expect(form.getByRole('heading', { name: 'Workout bearbeiten' })).toBeVisible();
  await expect(form.getByLabel('Workout Name')).toHaveValue(library.name);
  await expect(form.getByRole('button', { name: 'Als Favorit markieren' })).toHaveClass(/active/);
  await expect(form.getByRole('button', { name: 'Conditioning' })).toHaveClass(/active/);
  await expect(form.locator('.exercise-row span').filter({ hasText: 'Row' })).toBeVisible();
  await expect(form.getByRole('button', { name: 'Row entfernen' })).toBeVisible();
  await expect(form.getByRole('button', { name: 'Löschen' })).toBeVisible();
  await expect(page.locator('.backdrop')).toHaveCount(0);
});

test('+ Workout opens an inline creation form', async ({ page }) => {
  await page.getByRole('button', { name: 'Workouts' }).click();
  await page.getByRole('button', { name: '+ Workout' }).click();
  const form = page.locator('main form.library-capture');
  await expect(form.getByRole('heading', { name: 'Workout erstellen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abbrechen' })).toBeVisible();
  await expect(page.locator('.backdrop')).toHaveCount(0);
});

test('opens the 1RM calculator and calculates an estimate', async ({ page }) => {
  await page.getByRole('button', { name: '1RM Rechner' }).click();
  const dialog = page.getByRole('dialog', { name: /1RM Rechner/ });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Übung').selectOption('exercise-1');
  await dialog.getByLabel('Gewicht (kg)').fill('80');
  await dialog.getByLabel('Wiederholungen').fill('5');
  await expect(dialog.getByText('Geschätztes 1RM:')).toContainText('93.3 kg');
});

test('lists personal records and opens record creation', async ({ page }) => {
  await page.getByRole('button', { name: 'Persönliche Rekorde' }).click();
  const dialog = page.getByRole('dialog', { name: /Persönliche Rekorde/ });
  await expect(dialog.getByText('Bench Press')).toBeVisible();
  await expect(dialog.getByText('72.5 kg')).toBeVisible();
  await dialog.getByRole('button', { name: 'Rekord hinzufügen' }).click();
  await expect(dialog.getByRole('heading', { name: 'Neuer Rekord' })).toBeVisible();
  await expect(dialog.getByLabel('Name')).toBeVisible();
  await expect(dialog.getByLabel('Wert')).toBeVisible();
});
