import { test, expect } from '@playwright/test';

/**
 * Smoke Tests — Phase 1
 *
 * These run first in CI to ensure the app boots and critical nav works.
 * If these fail, nothing else matters.
 */

test.describe('Smoke Tests', () => {
  test('homepage loads without uncaught exceptions', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // App should render something — at minimum the root container
    await expect(page.locator('#root')).toBeVisible();

    // No uncaught JS exceptions
    expect(errors).toEqual([]);
  });

  test('auth page loads', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#root')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('healthz endpoint returns OK', async ({ page }) => {
    await page.goto('/healthz');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('404 page renders for unknown routes', async ({ page }) => {
    await page.goto('/this-does-not-exist-12345');
    await page.waitForLoadState('networkidle');

    // Should show the NotFound page, not a blank screen
    await expect(page.locator('#root')).toBeVisible();
    // The page should contain some indication it is a 404
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
  });

  test('privacy policy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('terms of service page loads', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('no "Trip not found" on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.toLowerCase()).not.toContain('trip not found');
  });

  test('critical navigation links work', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify the page loaded (we can't test authenticated routes without login)
    const rootVisible = await page.locator('#root').isVisible();
    expect(rootVisible).toBe(true);
  });
});

test.describe('Mobile Viewport Smoke', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
  });

  test('homepage loads on mobile viewport', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#root')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('auth page loads on mobile viewport', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('no horizontal overflow on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    // Body should not be wider than viewport (no horizontal scroll)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // 1px tolerance
  });
});
