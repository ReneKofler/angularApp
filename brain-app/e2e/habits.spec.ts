import { expect, Page, Route, test } from '@playwright/test';
import { signIn } from './helpers';

interface Check {
  id: string;
  habit_id: string;
  user_id: string;
  check_date: string;
  checked: boolean;
  sport_metric_value: number | null;
}

const userId = 'e2e-user';
const habitFixtures = [
  {
    id: 'habit-1',
    user_id: userId,
    name: 'Wasser trinken',
    description: 'Zwei Liter',
    color: '#08ad4b',
    start_date: '2026-08-01',
    end_date: '2026-08-03',
    linked_workout_type: 'Laufen',
    position: 0,
    collapsed: false,
    sport_type: 'Laufen',
    sport_metric_name: 'Distanz (km)',
    linked_training_plan_id: 'plan-1',
  },
  {
    id: 'habit-2',
    user_id: userId,
    name: 'Meditieren',
    description: null,
    color: '#9427e8',
    start_date: '2026-08-01',
    end_date: null,
    linked_workout_type: null,
    position: 1,
    collapsed: false,
    sport_type: null,
    sport_metric_name: null,
    linked_training_plan_id: null,
  },
  {
    id: 'habit-3',
    user_id: userId,
    name: 'Zukünftige Gewohnheit',
    description: null,
    color: '#2668e8',
    start_date: '2026-08-04',
    end_date: null,
    linked_workout_type: null,
    position: 2,
    collapsed: false,
    sport_type: null,
    sport_metric_name: null,
    linked_training_plan_id: null,
  },
];
let checks: Check[];
let habitRows: typeof habitFixtures;

async function mockHabits(page: Page) {
  checks = [
    {
      id: 'check-2',
      habit_id: 'habit-1',
      user_id: userId,
      check_date: '2026-08-02',
      checked: true,
      sport_metric_value: 4,
    },
    {
      id: 'check-3',
      habit_id: 'habit-1',
      user_id: userId,
      check_date: '2026-08-03',
      checked: true,
      sport_metric_value: 5,
    },
  ];
  habitRows = structuredClone(habitFixtures);
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').at(-1);
    if (!['habits', 'habit_checks', 'habit_streaks', 'training_plans'].includes(table ?? ''))
      return route.fallback();
    const method = route.request().method();
    if (method === 'GET') {
      if (table === 'habits') return route.fulfill({ json: habitRows });
      if (table === 'habit_checks') {
        const date = url.searchParams.get('check_date')?.replace('eq.', '');
        const data = date ? checks.filter((check) => check.check_date === date) : checks;
        if (route.request().headers()['accept']?.includes('application/vnd.pgrst.object')) {
          return route.fulfill({ json: data[0] ?? null });
        }
        return route.fulfill({ json: data });
      }
      if (table === 'habit_streaks') {
        return route.fulfill({
          json: [
            {
              habit_id: 'habit-1',
              user_id: userId,
              name: 'Wasser trinken',
              total_checks: checks.filter((check) => check.checked).length,
              last_check: '2026-08-03',
            },
          ],
        });
      }
      return route.fulfill({ json: [{ id: 'plan-1', name: '5K Plan' }] });
    }
    if (table === 'habit_checks') await updateCheck(route);
    if (table === 'habits' && method === 'PATCH') {
      const id = url.searchParams.get('id')?.replace('eq.', '');
      const habit = habitRows.find((item) => item.id === id);
      if (habit) Object.assign(habit, route.request().postDataJSON());
    }
    return route.fulfill({ status: method === 'DELETE' ? 204 : 201, json: {} });
  });
}

async function updateCheck(route: Route) {
  const url = new URL(route.request().url());
  const body = route.request().postDataJSON() as Partial<Check>;
  const id = url.searchParams.get('id')?.replace('eq.', '');
  const existing = id ? checks.find((check) => check.id === id) : undefined;
  if (existing) Object.assign(existing, body);
  else
    checks.push({
      id: `check-${checks.length + 1}`,
      user_id: userId,
      ...(body as Omit<Check, 'id' | 'user_id'>),
    });
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await mockHabits(page);
});

test('keeps checks, streaks, metrics and date ranges correct across dates', async ({ page }) => {
  await page.goto('/habits');
  await expect(page.getByRole('heading', { name: 'Wasser trinken' })).toBeVisible();
  await expect(page.getByText('Zukünftige Gewohnheit')).toBeHidden();
  await expect(page.getByText('2 Tage in Folge')).toBeVisible();
  await page.getByRole('button', { name: 'Vorheriger Tag' }).click();
  await expect(page.getByText('1 Tag in Folge')).toBeVisible();
  await page.getByRole('button', { name: 'Gewohnheit abwählen' }).click();
  await page.getByRole('button', { name: 'Nächster Tag' }).click();
  await expect(page.getByText('1 Tag in Folge')).toBeVisible();
  await page.getByLabel('Distanz (km)').fill('7.5');
  await page.getByLabel('Distanz (km)').press('Tab');
  await expect
    .poll(() => checks.find((check) => check.check_date === '2026-08-03')?.sport_metric_value)
    .toBe(7.5);
  await page.getByRole('button', { name: 'Nächster Tag' }).click();
  await expect(page.getByText('Zukünftige Gewohnheit')).toBeVisible();
  await expect(page.getByText('Wasser trinken')).toBeHidden();
});

test('opens the inline editor and exposes ordering, collapse and links', async ({ page }) => {
  await page.goto('/habits');
  await expect(page.getByText('Workout: Laufen')).toBeVisible();
  await expect(page.getByText('Trainingsplan verknüpft')).toBeVisible();
  await page.getByRole('button', { name: '+ Gewohnheit' }).click();
  await expect(page.getByRole('heading', { name: 'Neue Gewohnheit' })).toBeVisible();
  await expect(page.locator('.editor')).toBeInViewport();
  await page.getByRole('button', { name: 'Details ausblenden' }).first().click();
  await expect(page.getByText('Workout: Laufen')).toBeHidden();
  await page.getByRole('button', { name: 'Nach unten' }).first().click();
  await page.getByRole('button', { name: 'Details anzeigen' }).click();
  await page.getByRole('button', { name: 'Bearbeiten' }).first().click();
  await expect(page.getByRole('heading', { name: 'Gewohnheit bearbeiten' })).toBeVisible();
  await expect(page.getByLabel('Name der Gewohnheit')).toHaveValue('Wasser trinken');
});
