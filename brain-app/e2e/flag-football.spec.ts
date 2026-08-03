import { test, expect } from '@playwright/test';
import { signIn } from './helpers';
test.beforeEach(async ({ page }) => {
  await signIn(page);
  const data: Record<string, unknown[]> = {
    flag_football_formations: [
      { id: 'f', name: 'Trips', players: [{ id: 'p', label: 'WR', x: 20, y: 70 }] },
    ],
    flag_football_routes: [
      {
        id: 'r',
        name: 'Go',
        aliases: ['Fly'],
        segments: [
          { x: 20, y: 70 },
          { x: 20, y: 10 },
        ],
      },
    ],
    flag_football_plays: [
      {
        id: 'p1',
        name: 'Trips Go',
        formation_id: 'f',
        assignments: [{ player_id: 'p', route_id: 'r' }],
      },
    ],
    flag_football_playbook: [{ id: 'e1', play_id: 'p1', position: 0, flipped: false }],
  };
  for (const [table, json] of Object.entries(data))
    await page.route(`**/rest/v1/${table}**`, (r) =>
      r.request().method() === 'GET' ? r.fulfill({ json }) : r.fulfill({ status: 201, json: {} }),
    );
});
test('places formation players on the field', async ({ page }) => {
  await page.goto('/flag-football');
  await page.getByRole('button', { name: 'Formations' }).click();
  await expect(page.getByText('Trips')).toBeVisible();
  await expect(page.locator('.player')).toHaveCount(4);
  await page.getByRole('button', { name: 'RB', exact: true }).click();
  await page.locator('.field').click({ position: { x: 300, y: 150 } });
  await expect(page.locator('.player')).toHaveCount(5);
});
test('shows routes, assignments, and ordered playbook controls', async ({ page }) => {
  await page.goto('/flag-football');
  await page.getByRole('button', { name: 'Routes' }).click();
  await expect(page.getByText('Fly')).toBeVisible();
  await page.getByRole('button', { name: 'Plays' }).click();
  await expect(page.getByText(/1 Routen/)).toBeVisible();
  await page.getByRole('button', { name: 'Playbook', exact: true }).click();
  await expect(page.getByText('1. Trips Go')).toBeVisible();
  await page.getByRole('button', { name: 'Spiegeln' }).click();
  await expect(page.getByRole('article').getByText('Gespiegelt')).toBeVisible();
});
