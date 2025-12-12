import { test, expect } from '@playwright/test';

test.describe('Invite + Preview Links (no blank screens)', () => {
  test('join link renders a friendly UI for invalid/demo codes', async ({ page }) => {
    await page.goto('/join/demo-1-123456');
    // Should render an error state (not a blank screen)
    await expect(page.getByText(/Invalid Invite|Invite/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Go to Dashboard|Go to Home/i })).toBeVisible();
  });

  test('trip preview demo renders a preview card', async ({ page }) => {
    await page.goto('/trip/1/preview');
    await expect(page.getByRole('heading', { name: /Spring Break Cancun/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Cancun/i)).toBeVisible();
  });
});

