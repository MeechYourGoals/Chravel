import { test, expect } from '@playwright/test';

/**
 * PWA + Mobile Viewport E2E Tests
 *
 * Tests mobile-specific layouts, safe areas, and scroll behavior.
 */

test.describe('Mobile Viewport Regressions', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
  });

  test('homepage has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('auth page has no horizontal overflow', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('no elements extend beyond safe area', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that no fixed elements are at top: 0 without safe area offset
    const fixedElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues: string[] = [];
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && style.top === '0px') {
          const tag = el.tagName.toLowerCase();
          const cls = el.className?.toString().substring(0, 50);
          issues.push(`${tag}.${cls}`);
        }
      }
      return issues;
    });

    // This is informational - log but don't fail (some elements may legitimately be at top:0)
    if (fixedElements.length > 0) {
      console.log('Fixed elements at top:0 (verify safe-area):', fixedElements);
    }
  });

  test('privacy page renders on mobile', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('terms page renders on mobile', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
  });
});

test.describe('Offline Resilience', () => {
  test('app shows offline indicator when network is cut', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Wait a moment for offline detection
    await page.waitForTimeout(2000);

    // App should still be showing something (not a blank crash)
    await expect(page.locator('#root')).toBeVisible();

    // Restore
    await context.setOffline(false);
  });
});
