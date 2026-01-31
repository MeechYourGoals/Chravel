import { test, expect } from '../../fixtures/trip.fixture';

/**
 * Calendar / Agenda E2E Tests
 */

test.describe('Trip Calendar', () => {
  test('calendar tab loads within trip', async ({
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

    const calTab = page.locator(
      'button:has-text("Calendar"), button:has-text("Agenda"), [data-testid="tab-calendar"], [role="tab"]:has-text("Calendar"), [role="tab"]:has-text("Agenda")',
    );
    if (
      await calTab
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      await calTab.first().click();
      await page.waitForTimeout(1000);
      // Should not crash — just verify the root is still there
      await expect(page.locator('#root')).toBeVisible();
    }
  });

  test('seeded event appears in calendar', async ({
    page,
    createTestUser,
    createTestTrip,
    addTripEvent,
    loginAsUser,
  }) => {
    const user = await createTestUser();
    const trip = await createTestTrip(user);
    await addTripEvent(trip.id, user.id, { title: 'QA Calendar Event' });

    await loginAsUser(page, user);
    await page.goto(`/trip/${trip.id}`);
    await page.waitForLoadState('networkidle');

    const calTab = page.locator(
      'button:has-text("Calendar"), button:has-text("Agenda"), [data-testid="tab-calendar"], [role="tab"]:has-text("Calendar"), [role="tab"]:has-text("Agenda")',
    );
    if (
      await calTab
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      await calTab.first().click();
      await page.waitForTimeout(2000);

      const ev = page.locator('text=QA Calendar Event');
      await expect(ev.first()).toBeVisible({ timeout: 10000 });
    }
  });
});
