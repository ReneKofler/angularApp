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
  await expect(page.getByRole('heading', { name: 'Übungen & Training' })).toBeVisible();
  await expect(page.getByText('Back Squat')).toBeVisible();
  await expect(page.getByText('Barbell')).toBeVisible();
  await page.getByRole('button', { name: /Back Squat/ }).click();
  await expect(page.getByRole('heading', { name: 'Übung bearbeiten' })).toBeVisible();
  await expect(page.getByLabel('Gewicht')).toBeChecked();
  await expect(page.getByLabel('1RM')).toBeChecked();
});

test('builds an ordered training plan and exposes capability-driven values', async ({ page }) => {
  await page.getByRole('button', { name: 'Trainingspläne' }).click();
  await page.getByRole('button', { name: '+ Trainingsplan' }).click();
  await page.getByLabel('Name').fill('Strength A');
  await page.getByLabel('Übung hinzufügen').selectOption('ex-1');
  await expect(page.getByText('1. Back Squat')).toBeVisible();
  await expect(page.getByLabel('Sätze')).toHaveValue('3');
  await expect(page.getByLabel('Reps')).toHaveValue('10');
});

test('opens plan workout logging', async ({ page }) => {
  await page.getByRole('button', { name: 'Trainingspläne' }).click();
  await page.getByRole('button', { name: 'Training loggen' }).click();
  await expect(page.getByRole('heading', { name: 'Leg Day loggen' })).toBeVisible();
  await expect(page.getByLabel('Datum')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Training speichern' })).toBeVisible();
});
