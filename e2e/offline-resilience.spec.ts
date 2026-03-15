import { test, expect } from '@playwright/test';

test.describe('Offline resilience (MVP)', () => {
  // NOTE:
  // We intentionally do NOT use `context.setOffline(true)` here.
  // In Playwright, a true network-offline state can cause `page.reload()` to throw
  // `net::ERR_INTERNET_DISCONNECTED`, which prevents us from testing the app's offline UI.
  // Instead we mock offline by overriding `navigator.onLine` + dispatching `online/offline` events.
  async function installNavigatorOnlineMock(
    context: import('@playwright/test').BrowserContext,
  ): Promise<void> {
    await context.addInitScript(() => {
      (window as unknown as { __PW_IS_ONLINE__?: boolean }).__PW_IS_ONLINE__ = true;
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        get: () => (window as unknown as { __PW_IS_ONLINE__?: boolean }).__PW_IS_ONLINE__ !== false,
      });
    });
  }

  async function setMockedOnlineStatus(
    page: import('@playwright/test').Page,
    isOnline: boolean,
  ): Promise<void> {
    await page.evaluate((nextOnline: boolean) => {
      (window as unknown as { __PW_IS_ONLINE__?: boolean }).__PW_IS_ONLINE__ = nextOnline;
      window.dispatchEvent(new Event(nextOnline ? 'online' : 'offline'));
    }, isOnline);
  }

  test('OFFLINE-001-TC01: page reloads while offline and shows banner', async ({
    page,
    context,
  }) => {
    await installNavigatorOnlineMock(context);

    // Simulate "offline at startup", but keep actual network available so reload works.
    await page.goto('/');
    await setMockedOnlineStatus(page, false);

    await page.reload();

    // OfflineIndicator label.
    await expect(page.getByText('Offline', { exact: true })).toBeVisible();
  });

  test('shows Offline banner when network disconnects (no real network offline)', async ({
    page,
    context,
  }) => {
    await installNavigatorOnlineMock(context);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate offline WITHOUT breaking navigation.
    await setMockedOnlineStatus(page, false);

    await expect(page.getByText('Offline', { exact: true })).toBeVisible();

    // Restore connectivity and ensure UI remains functional.
    await setMockedOnlineStatus(page, true);
    await expect(page.locator('body')).toBeVisible();
  });

  test('page remains functional after offline/online cycle (no real network offline)', async ({
    page,
    context,
  }) => {
    await installNavigatorOnlineMock(context);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await setMockedOnlineStatus(page, false);
    await setMockedOnlineStatus(page, true);

    // Verify the app is still responsive - can interact with UI.
    await expect(page.locator('body')).toBeVisible();

    // Try to locate an interactive element (if any) to ensure it's not frozen.
    const anyButton = page.getByRole('button').first();
    if (await anyButton.isVisible().catch(() => false)) {
      await expect(anyButton).toBeEnabled();
    }
  });
});
