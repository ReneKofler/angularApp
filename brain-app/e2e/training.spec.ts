import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

const equipment = [{ id: 'eq-1', user_id: 'u', name: 'Barbell', icon: '🏋️' }];
const exercises = [
  {
    id: 'ex-1',
    user_id: 'u',
    name: 'Back Squat',
    equipment_ids: ['eq-1'],
    muscle_group_ids: ['legs'],
    has_1rm: true,
    has_max_reps: false,
    has_kg: true,
    has_meter: false,
    has_reps: true,
    has_calories: false,
    has_time: false,
  },
];
const plans = [
  {
    id: 'plan-1',
    user_id: 'u',
    name: 'Leg Day',
    description: 'Strength',
    duration_estimate: '45 Min.',
    exercises: [{ exercise_id: 'ex-1', name: 'Back Squat', sets: 3, reps: 5 }],
  },
];

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.route('**/rest/v1/equipment**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(equipment),
    }),
  );
  await page.route('**/rest/v1/exercises**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(exercises),
    }),
  );
  await page.route('**/rest/v1/training_plans**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(plans) }),
  );
  await page.goto('/training');
});

test('shows associated exercises and capability flags', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Übungen', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Trainingsbereiche' })).toBeVisible();
  await expect(page.getByText('Back Squat')).toBeVisible();
  await expect(page.getByText('Barbell')).toBeVisible();
  await page.getByRole('button', { name: /Back Squat/ }).click();
  await expect(page.getByRole('heading', { name: 'Übung bearbeiten' })).toBeVisible();
  await expect(page.getByLabel('Gewicht')).toBeChecked();
  await expect(page.getByLabel('1RM')).toBeChecked();
});

test('shows equipment in its own tab', async ({ page }) => {
  await page.getByRole('button', { name: 'Equipment', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Equipment' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Barbell/ })).toBeVisible();
});

test('selects muscles in the muscle overview', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Trainingspläne' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Muskeln' }).click();
  await expect(page.getByRole('heading', { name: 'Muskeln' })).toBeVisible();
  for (const muscle of [
    'Chest',
    'Back',
    'Shoulders',
    'Biceps',
    'Triceps',
    'Forearms',
    'Core',
    'Quads',
    'Glutes',
    'Hamstrings',
    'Calves',
  ]) {
    await page.getByRole('button', { name: muscle }).click();
    await expect(page.getByRole('button', { name: muscle })).toHaveClass(/active/);
    await expect(page.locator(`[data-muscle="${muscle}"]`)).toHaveCSS('opacity', '1');
  }
});
