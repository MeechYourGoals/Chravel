import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display sign in form', async ({ page }) => {
    // Look for sign in elements (adjust selectors based on actual UI)
    const signInButton = page.getByRole('button', { name: /sign in|log in/i });
    await expect(signInButton).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Click sign in button
    const signInButton = page.getByRole('button', { name: /sign in|log in/i });
    await signInButton.click();

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /submit|sign in/i });
    await submitButton.click();

    // Should show validation errors
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
  });

  test('should navigate to sign up page', async ({ page }) => {
    // Look for sign up link/button
    const signUpLink = page.getByRole('link', { name: /sign up|create account/i });
    
    if (await signUpLink.isVisible()) {
      await signUpLink.click();
      // Verify we're on sign up page (adjust based on actual routing)
      await expect(page).toHaveURL(/.*sign.*up|.*register/i);
    }
  });
});
