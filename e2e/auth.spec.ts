import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display sign in form for unauthenticated users', async ({ page }) => {
    // Check if auth modal or sign in form is visible
    const signInButton = page.getByRole('button', { name: /sign in|login/i });
    await expect(signInButton).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Click sign in button if modal is needed
    const signInButton = page.getByRole('button', { name: /sign in|login/i });
    await signInButton.click();

    // Fill in invalid credentials
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid@example.com');
      await passwordInput.fill('wrongpassword');
      
      const submitButton = page.getByRole('button', { name: /sign in|submit/i });
      await submitButton.click();

      // Should show error message
      await expect(page.getByText(/error|invalid|incorrect/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate to sign up form', async ({ page }) => {
    const signUpLink = page.getByRole('link', { name: /sign up|create account/i });
    if (await signUpLink.isVisible()) {
      await signUpLink.click();
      
      // Should show sign up form fields
      const firstNameInput = page.getByLabel(/first name/i);
      await expect(firstNameInput).toBeVisible();
    }
  });
});
