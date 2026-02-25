import { test, expect } from '@playwright/test';

/**
 * Chravel Smoke Tests — Critical Path Coverage
 *
 * These tests verify the app loads, renders, and core navigation works.
 * They do NOT require a real Supabase connection — the app has hardcoded
 * defaults for dev and gracefully handles missing backend connections.
 *
 * Run: npx playwright test e2e/specs/smoke.spec.ts
 */

test.describe('Smoke Tests — App Shell', () => {
  test('1. App loads without blank screen', async ({ page }) => {
    await page.goto('/');
    // The app should render something visible (not a blank white page)
    await expect(page.locator('body')).not.toBeEmpty();
    // Should have the root React mount point with content
    const root = page.locator('#root');
    await expect(root).toBeAttached();
    // Wait for React to hydrate — at least one visible element
    await page.waitForSelector('#root > *', { timeout: 15000 });
  });

  test('2. No critical console errors on initial load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected warnings/errors
        if (
          text.includes('Using hardcoded defaults') ||
          text.includes('net::ERR_') ||
          text.includes('Failed to fetch') ||
          text.includes('RevenueCat') ||
          text.includes('PostHog') ||
          text.includes('Sentry')
        ) {
          return;
        }
        errors.push(text);
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000); // Allow async operations to settle

    // Filter out non-critical errors
    const criticalErrors = errors.filter(
      e =>
        !e.includes('favicon') &&
        !e.includes('manifest') &&
        !e.includes('service-worker') &&
        !e.includes('sw.js'),
    );

    expect(criticalErrors).toEqual([]);
  });

  test('3. Navigation elements are present on landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    // The landing page should have at minimum a sign-in or get-started CTA
    const hasAuthCta = await page
      .getByRole('button', { name: /sign in|log in|get started/i })
      .first()
      .isVisible()
      .catch(() => false);

    const hasLink = await page
      .getByRole('link', { name: /sign in|log in|get started/i })
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasAuthCta || hasLink).toBe(true);
  });
});

test.describe('Smoke Tests — Auth Page', () => {
  test('4. Auth page renders sign-in form', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    // Auth page should have an email input
    const emailInput = page.getByPlaceholder(/email/i);
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(emailInput).toBeEnabled();
  });

  test('5. Auth page shows password field', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    // Should have password input
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Smoke Tests — Demo Mode', () => {
  test('6. Demo entry page loads', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    // Demo page should render without errors — either content or redirect
    const url = page.url();
    // It either stays on /demo or redirects to a demo trip
    expect(url).toMatch(/\/(demo|trip)/);
  });
});

test.describe('Smoke Tests — Static Pages', () => {
  test('7. Healthz endpoint returns build info', async ({ page }) => {
    await page.goto('/healthz');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    // Healthz should show something (build version, status)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(10);
  });

  test('8. Privacy policy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    // Should contain privacy-related text
    expect(bodyText!.toLowerCase()).toMatch(/privacy|data|information/);
  });

  test('9. Terms of service page loads', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.toLowerCase()).toMatch(/terms|service|agreement/);
  });

  test('10. Not found page renders for invalid routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-12345');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    // Should render a NotFound page, not a blank screen
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
  });
});

test.describe('Smoke Tests — Settings', () => {
  test('11. Settings page loads (redirects to auth if not logged in)', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    // Should either show settings or redirect to auth/landing
    const url = page.url();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    // Either we're on settings or redirected
    expect(url).toMatch(/\/(settings|auth|$)/);
  });
});

test.describe('Smoke Tests — PWA Manifest', () => {
  test('12. manifest.json is valid and accessible', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
  });

  test('13. PWA icons are accessible', async ({ request }) => {
    const manifestResponse = await request.get('/manifest.json');
    const manifest = await manifestResponse.json();

    for (const icon of manifest.icons) {
      const iconResponse = await request.get(icon.src);
      expect(iconResponse.status()).toBe(200);
    }
  });
});

test.describe('Smoke Tests — Invite Flow', () => {
  test('14. Join trip page loads for invalid token (graceful error)', async ({ page }) => {
    await page.goto('/join/invalid-test-token-12345');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    // Page should render (not blank) even with invalid token
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    // Should not crash — might show error or redirect
  });
});

test.describe('Smoke Tests — Offline Resilience', () => {
  test('15. App handles network offline gracefully', async ({ page, context }) => {
    // First load normally
    await page.goto('/');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(2000);

    // Page should still be visible (not crash)
    const root = page.locator('#root');
    await expect(root).toBeAttached();

    // Come back online
    await context.setOffline(false);
    await page.waitForTimeout(2000);

    // Page should recover
    await expect(root).toBeAttached();
  });
});

test.describe('Smoke Tests — SPA Routing', () => {
  test('16. Deep link to /trip/:id does not 404 (SPA fallback)', async ({ page }) => {
    // This tests that the SPA router handles direct navigation
    await page.goto('/trip/00000000-0000-0000-0000-000000000001');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    // Should render React app (not a server 404)
    const root = page.locator('#root');
    await expect(root).toBeAttached();
    const children = await root.locator('> *').count();
    expect(children).toBeGreaterThan(0);
  });

  test('17. Deep link to /tour/pro/:id does not 404', async ({ page }) => {
    await page.goto('/tour/pro/test-pro-trip-id');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    const root = page.locator('#root');
    await expect(root).toBeAttached();
  });

  test('18. Legacy pro trip URL redirects correctly', async ({ page }) => {
    await page.goto('/tour/pro-some-trip-id');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    // Should redirect from /tour/pro-{id} to /tour/pro/{id}
    const url = page.url();
    expect(url).toContain('/tour/pro/');
  });
});
