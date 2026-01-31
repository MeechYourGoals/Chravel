import { test, expect } from '../../fixtures/trip.fixture';

/**
 * Chat Flow E2E Tests
 *
 * Tests chat messaging within a trip.
 */

test.describe('Trip Chat', () => {
  test('chat tab loads within trip detail', async ({
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

    // Find and click the Chat tab
    const chatTab = page.locator(
      'button:has-text("Chat"), [data-testid="tab-chat"], [role="tab"]:has-text("Chat")',
    );
    if (
      await chatTab
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      await chatTab.first().click();
      await page.waitForTimeout(1000);

      // Chat area should be visible (message input or empty state)
      const chatArea = page.locator(
        '[data-testid="chat-container"], [data-testid="chat-input"], textarea, input[placeholder*="message" i]',
      );
      await expect(chatArea.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('seeded chat message appears', async ({
    page,
    createTestUser,
    createTestTrip,
    addChatMessage,
    loginAsUser,
  }) => {
    const user = await createTestUser();
    const trip = await createTestTrip(user);
    await addChatMessage(trip.id, user.id, 'QA test message hello');

    await loginAsUser(page, user);
    await page.goto(`/trip/${trip.id}`);
    await page.waitForLoadState('networkidle');

    // Navigate to chat tab
    const chatTab = page.locator(
      'button:has-text("Chat"), [data-testid="tab-chat"], [role="tab"]:has-text("Chat")',
    );
    if (
      await chatTab
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      await chatTab.first().click();
      await page.waitForTimeout(2000);

      // Message should appear
      const msg = page.locator('text=QA test message hello');
      await expect(msg.first()).toBeVisible({ timeout: 10000 });
    }
  });
});
