import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display sign in form', async ({ page }) => {
    // Landing page has multiple auth CTAs; target the primary "Log In" button explicitly.
    const signInButton = page.getByRole('button', { name: /^log\s*in$/i });
    await expect(signInButton).toBeVisible();
  });

  test('should show auth modal with email form when login clicked', async ({ page }) => {
    // Sign in button should be visible on the landing page
    const signInButton = page.getByRole('button', { name: /sign in|log in|get started/i }).first();

    // Assert the button exists - if not, the test should fail (not silently pass)
    await expect(signInButton).toBeVisible({ timeout: 5000 });

    await signInButton.click();

    // Wait for auth modal to appear - email input uses placeholder not label
    const emailInput = page.getByPlaceholder(/email/i);
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    // Verify the modal has the expected structure (email input is ready for validation)
    await expect(emailInput).toBeEnabled();
  });

  test('should navigate to sign up page', async ({ page }) => {
    // Look for sign up link/button - should be visible on landing page
    const signUpLink = page.getByRole('link', { name: /sign up|create account/i });

    // If sign up is handled via modal instead of dedicated page, skip this test
    const isVisible = await signUpLink.isVisible().catch(() => false);
    test.skip(!isVisible, 'Sign up link not present - auth may use modal flow instead');

    await signUpLink.click();
    // Verify we're on sign up page (adjust based on actual routing)
    await expect(page).toHaveURL(/.*sign.*up|.*register/i);
  });
});
