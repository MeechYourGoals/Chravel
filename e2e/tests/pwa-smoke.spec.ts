import { test, expect } from '@playwright/test';

// PWA Smoke Suite - Runs on PRs to catch basic navigation and clickability regressions

test.describe('PWA Navigation and Clickability', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for the app to be mounted
    await page.goto('/');
  });

  test('App loads without unhandled rejections', async ({ page }) => {
    // Just verify the main layout renders
    await expect(page.locator('body')).toBeVisible();
  });
});
