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
test('manages formations and deterministic field flipping', async ({ page }) => {
  await page.goto('/flag-football');
  await expect(page.getByText('Trips')).toBeVisible();
  const player = page.locator('.player').filter({ hasText: 'WR' }).first();
  await expect(player).toHaveAttribute('style', /left: 20%/);
  await page.getByRole('button', { name: 'Formation spiegeln' }).click();
  await expect(player).toHaveAttribute('style', /left: 80%/);
});
test('shows routes, assignments, and ordered playbook controls', async ({ page }) => {
  await page.goto('/flag-football');
  await page.getByRole('button', { name: 'Routen' }).click();
  await expect(page.getByText('Fly')).toBeVisible();
  await page.getByRole('button', { name: 'Plays' }).click();
  await expect(page.getByText('1 Zuweisungen')).toBeVisible();
  await page.getByRole('button', { name: 'Playbook', exact: true }).click();
  await expect(page.getByText('1. Trips Go')).toBeVisible();
  await page.getByRole('button', { name: 'Spiegeln' }).click();
  await expect(page.getByText('Gespiegelt')).toBeVisible();
});
