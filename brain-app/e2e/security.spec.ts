import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test('row-level security rejects records forged for another user', async ({ page }) => {
  await signIn(page);
  const auth = await page.evaluate(() => {
    const entry = Object.entries(localStorage).find(
      ([key]) => key.startsWith('sb-') && key.endsWith('-auth-token'),
    );
    if (!entry) throw new Error('Supabase session was not stored.');
    const session = JSON.parse(entry[1]);
    return { accessToken: session.access_token, projectRef: entry[0].split('-')[1] };
  });

  const status = await page.evaluate(
    async ({ accessToken, projectRef, foreignUserId }) => {
      const response = await fetch(`https://${projectRef}.supabase.co/rest/v1/notes`, {
        method: 'POST',
        headers: {
          apikey: accessToken,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          user_id: foreignUserId,
          title: 'RLS ownership probe',
          content: '',
          tags: [],
          done: false,
          list_id: null,
          position: 0,
          reminder_date: null,
          mode: 'text',
          priority: 'low',
        }),
      });
      return response.status;
    },
    { ...auth, foreignUserId: randomUUID() },
  );

  expect([401, 403]).toContain(status);
});
