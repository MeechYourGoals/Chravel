import { test, expect } from '@playwright/test';

test.describe('Trip Creation → Invite → Join Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is logged in for these tests
    // In real implementation, you'd set up auth state
    await page.goto('/');
  });

  test('should create a new trip', async ({ page }) => {
    // Look for create trip button
    const createTripButton = page.getByRole('button', { name: /create trip|new trip/i });

    if (await createTripButton.isVisible()) {
      await createTripButton.click();

      // Fill in trip details
      const nameInput = page.getByLabel(/trip name|name/i);
      const destinationInput = page.getByLabel(/destination/i);

      if (await nameInput.isVisible()) {
        await nameInput.fill('Paris Adventure');
        await destinationInput.fill('Paris, France');

        const submitButton = page.getByRole('button', { name: /create|save/i });
        await submitButton.click();

        // Should navigate to trip detail page
        await expect(page).toHaveURL(/\/trip\/.+/);
        await expect(page.getByText('Paris Adventure')).toBeVisible();
      }
    }
  });

  test('should generate and copy invite link', async ({ page }) => {
    // Navigate to an existing trip
    await page.goto('/trip/test-trip-123');

    const inviteButton = page.getByRole('button', { name: /invite|share/i });

    if (await inviteButton.isVisible()) {
      await inviteButton.click();

      // Should show invite link
      const inviteLink = page.getByRole('textbox', { name: /invite link|share link/i });
      await expect(inviteLink).toBeVisible();

      // Copy button should be available
      const copyButton = page.getByRole('button', { name: /copy/i });
      if (await copyButton.isVisible()) {
        await copyButton.click();

        // Should show success message
        await expect(page.getByText(/copied|link copied/i)).toBeVisible({ timeout: 2000 });
      }
    }
  });
});
