import { test, expect } from '../../fixtures/trip.fixture';

/**
 * Pro Trip E2E Tests
 *
 * Tests pro/enterprise trip flows.
 */

test.describe('Pro Trip Detail', () => {
  test('pro trip detail page loads', async ({
    page,
    createTestUser,
    createTestTrip,
    loginAsUser,
  }) => {
    const user = await createTestUser({ isPro: true });
    const trip = await createTestTrip(user, { tripType: 'pro', name: 'QA Pro Trip' });

    await loginAsUser(page, user);
    await page.goto(`/tour/pro/${trip.id}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#root')).toBeVisible();

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.toLowerCase()).not.toContain('trip not found');
  });

  test('legacy pro trip URL redirects', async ({ page }) => {
    // /tour/pro-<id> should redirect to /tour/pro/<id>
    await page.goto('/tour/pro-some-test-id');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/tour/pro/some-test-id');
  });
});
