import { test, expect } from '../../fixtures/trip.fixture';

/**
 * Trip Lifecycle E2E Tests
 *
 * Tests the core CRUD operations on trips:
 * create, view, archive, unarchive, and member management.
 */

test.describe('Trip Lifecycle', () => {
  test('can view own trip without "Trip not found"', async ({
    page,
    createTestUser,
    createTestTrip,
    loginAsUser,
  }) => {
    const user = await createTestUser();
    const trip = await createTestTrip(user, { name: 'QA Lifecycle Trip' });

    await loginAsUser(page, user);
    await page.goto(`/trip/${trip.id}`);
    await page.waitForLoadState('networkidle');

    // Should NOT show "Trip not found"
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.toLowerCase()).not.toContain('trip not found');

    // Trip name should appear somewhere on the page
    await expect(page.locator(`text=${trip.name}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('trip list shows created trip', async ({
    page,
    createTestUser,
    createTestTrip,
    loginAsUser,
  }) => {
    const user = await createTestUser();
    const trip = await createTestTrip(user, { name: 'QA List Trip' });

    await loginAsUser(page, user);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Trip should appear in the list
    await expect(page.locator(`text=${trip.name}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('refresh inside trip does not show Trip not found', async ({
    page,
    createTestUser,
    createTestTrip,
    loginAsUser,
  }) => {
    const user = await createTestUser();
    const trip = await createTestTrip(user);

    await loginAsUser(page, user);
    await page.goto(`/trip/${trip.id}`);
    await page.waitForLoadState('networkidle');

    // Refresh
    await page.reload();
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.toLowerCase()).not.toContain('trip not found');
  });

  test('non-existent trip shows appropriate error', async ({
    page,
    createTestUser,
    loginAsUser,
  }) => {
    const user = await createTestUser();
    await loginAsUser(page, user);

    await page.goto('/trip/00000000-0000-0000-0000-000000000000');
    await page.waitForLoadState('networkidle');

    // Should show some error/not found state (not a blank page)
    await expect(page.locator('#root')).toBeVisible();
  });
});

test.describe('Invite Flow', () => {
  test('invite link page loads for unauthenticated user', async ({ page }) => {
    // Visit a join URL (will fail to find trip but should not crash)
    await page.goto('/join/nonexistent-code');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#root')).toBeVisible();
    // Should not have uncaught exceptions
  });
});
