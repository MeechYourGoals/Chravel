import { test, expect } from '@playwright/test';

test.describe('Offline resilience (MVP)', () => {
  test('shows Offline / Reconnecting / Synced banner and queues chat message when possible', async ({
    page,
    context,
  }) => {
    // Start online at home
    await context.setOffline(false);
    await page.goto('/');

    // Force offline and confirm banner appears
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText('Offline', { exact: true })).toBeVisible({ timeout: 10_000 });

    // Try to find a trip route that exposes chat input without auth (demo / public experience varies).
    await context.setOffline(false);
    await page.goto('/trip/1');

    // If trip page isn't available, just assert we can still go offline/online at home.
    if (await page.getByText(/Trip Not Found/i).isVisible().catch(() => false)) {
      await context.setOffline(true);
      await page.goto('/');
      await expect(page.getByText('Offline', { exact: true })).toBeVisible({ timeout: 10_000 });
      await context.setOffline(false);
      await page.reload();
      await expect(page.getByText('Synced', { exact: true })).toBeVisible({ timeout: 10_000 });
      test.skip(true, 'Trip page not available without auth; queued-chat check skipped.');
    }

    // Look for a chat composer. If absent, skip queued-write assertion (auth required).
    const chatInput = page.getByPlaceholder(/type.*message|message/i);
    if (!(await chatInput.isVisible().catch(() => false))) {
      test.skip(true, 'Chat composer not available (likely requires auth).');
    }

    // Queue a message while offline.
    await context.setOffline(true);
    await page.waitForTimeout(250);
    await expect(page.getByText('Offline', { exact: true })).toBeVisible({ timeout: 10_000 });

    const msg = `offline-smoke-${Date.now()}`;
    await chatInput.fill(msg);
    await chatInput.press('Enter');

    // Banner should reflect that we’re offline and will sync later.
    // (In Offline state we intentionally show a human message rather than a pending count.)
    await expect(page.getByText(/sync/i)).toBeVisible({ timeout: 10_000 });

    // Restore connectivity and expect sync to complete.
    await context.setOffline(false);
    await page.waitForTimeout(500);

    const synced = page.getByText('Synced', { exact: true });
    const offline = page.getByText('Offline', { exact: true });

    // Either the “Synced” badge appears briefly, or the banner disappears quickly after sync.
    await expect
      .poll(async () => {
        const syncedVisible = await synced.isVisible().catch(() => false);
        const offlineVisible = await offline.isVisible().catch(() => false);
        return syncedVisible || !offlineVisible;
      })
      .toBeTruthy();
  });
});

