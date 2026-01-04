import { test, expect } from '@playwright/test';

test.describe('Invite + Preview Links (no blank screens)', () => {
  test('join link renders a friendly UI for invalid codes', async ({ page }) => {
    // Use a non-demo invalid code (demo-* codes redirect to auth signup)
    await page.goto('/join/invalid-xyz-test-12345');
    // Should render an error state (not a blank screen)
    await expect(page.getByText(/Invalid Invite|Invite Not Found|Connection Error/i)).toBeVisible({
      timeout: 10_000,
    });
    // Verify at least one action button is visible (use .first() since there may be multiple)
    await expect(
      page.getByRole('button', { name: /Go to Dashboard|Try Again|Reload/i }).first(),
    ).toBeVisible();
  });

  test('trip preview demo renders a preview card', async ({ page }) => {
    await page.goto('/trip/1/preview');
    // Verify the heading contains the trip name - this confirms the preview loaded
    await expect(page.getByRole('heading', { name: /Spring Break Cancun/i })).toBeVisible({
      timeout: 10_000,
    });
    // The heading assertion already validates content - no redundant checks needed
  });
});
