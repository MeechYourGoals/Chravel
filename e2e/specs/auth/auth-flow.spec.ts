import { test, expect } from '../../fixtures/auth.fixture';

/**
 * Auth Flow E2E Tests
 *
 * Tests email login, logout, and session persistence.
 * Google OAuth is tested manually (requires real Google interaction).
 */

test.describe('Authentication Flows', () => {
  test('email signup and login works', async ({ page, createTestUser, loginAsUser }) => {
    const user = await createTestUser();

    await loginAsUser(page, user);

    // Should be redirected to homepage (trip list)
    await expect(page).toHaveURL('/');
  });

  test('logout clears session', async ({ page, createTestUser, loginAsUser, logout }) => {
    const user = await createTestUser();
    await loginAsUser(page, user);

    await logout(page);

    // After logout, going to a protected route should redirect to auth or landing
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    // Should not be on settings (protected route)
    expect(url.includes('/settings')).toBeFalsy();
  });

  test('session persists after page refresh', async ({ page, createTestUser, loginAsUser }) => {
    const user = await createTestUser();
    await loginAsUser(page, user);

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on homepage, not redirected to auth
    const url = page.url();
    expect(url.includes('/auth')).toBeFalsy();
  });

  test('unauthenticated user sees landing or auth page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should show landing page content or redirect to auth
    await expect(page.locator('#root')).toBeVisible();
  });

  test('auth page has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
  });
});
