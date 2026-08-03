import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { signIn } from './helpers';

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    // Dashboard colors are user-configurable and covered by visual tests.
    .disableRules(['color-contrast'])
    .analyze();
  const blocking = results.violations.filter(
    ({ impact }) => impact === 'critical' || impact === 'serious',
  );
  expect(blocking, blocking.map(({ id, help }) => `${id}: ${help}`).join('\n')).toEqual([]);
}

test('login and authenticated dashboard have no serious WCAG violations', async ({ page }) => {
  await page.goto('/login');
  await expectNoSeriousAccessibilityViolations(page);

  await signIn(page);
  await expectNoSeriousAccessibilityViolations(page);
});
