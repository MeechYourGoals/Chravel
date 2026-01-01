import { test, expect, type Page } from '@playwright/test';

/**
 * Settings E2E Hardening
 *
 * These tests intentionally avoid real Supabase auth by forcing demo mode:
 * - `TRIPS_DEMO_VIEW=app-preview` makes SettingsMenu use a mock demo user if no real user exists.
 *
 * Hardening goal:
 * - Prove Settings entry points work in both desktop (PWA) and mobile layouts.
 * - Catch regressions where clicking Settings would crash into the global ErrorBoundary.
 */

async function enableAppPreviewDemoMode(page: Page): Promise<void> {
  // Ensure localStorage is set before app code runs.
  await page.addInitScript(() => {
    window.localStorage.setItem('TRIPS_DEMO_VIEW', 'app-preview');
  });
}

test.describe('Settings hardening', () => {
  test('PWA/desktop: Settings opens from the action bar (demo app-preview)', async ({ page }) => {
    await enableAppPreviewDemoMode(page);
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/');

    // Entry point: TripActionBar settings button uses aria-label="Settings"
    await page.getByLabel('Settings').click();

    // Shell should render (tabs present) – this is what regressed previously.
    await expect(page.getByRole('button', { name: 'Consumer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enterprise' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Events' })).toBeVisible();

    // Guard against falling into the app-level full-page error UI.
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test('Mobile: Quick Settings sheet opens, then All Settings opens full SettingsMenu (demo app-preview)', async ({
    page,
  }) => {
    await enableAppPreviewDemoMode(page);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/');

    // Open the mobile settings sheet via the same action bar Settings button.
    await page.getByLabel('Settings').click();

    await expect(page.getByText('Quick Settings')).toBeVisible();

    // From the sheet, open the full Settings menu overlay.
    await page.getByRole('button', { name: 'All Settings' }).click();

    await expect(page.getByRole('button', { name: 'Consumer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enterprise' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Events' })).toBeVisible();

    // We specifically want to prevent the global ErrorBoundary "refresh" experience.
    await expect(page.getByText(/refresh page/i)).not.toBeVisible();
  });
});
