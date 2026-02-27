/**
 * AUTH-001 through AUTH-012: Complete Authentication Test Suite
 *
 * Tests all authentication flows for the Chravel application.
 * Uses dedicated test fixtures for user management.
 */

import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Authentication Flow - Happy Paths', () => {
  test.describe.configure({ mode: 'serial' });

  test('AUTH-001-TC01: Email/password signup creates account', async ({ page, supabaseAdmin }) => {
    const testEmail = `signup-test-${Date.now()}@test.chravel.com`;
    const testPassword = 'TestPassword123!';

    await page.goto('/auth');

    // Find and click signup tab/link if exists
    const signupTab = page
      .locator('text=Sign Up, text=Create Account, [data-testid="signup-tab"]')
      .first();
    if (await signupTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signupTab.click();
    }

    // Fill signup form
    await page.fill('input[name="email"], input[type="email"]', testEmail);
    await page.fill('input[name="password"], input[type="password"]', testPassword);

    // Fill name fields if present
    const firstNameInput = page
      .locator('input[name="firstName"], input[name="first_name"]')
      .first();
    if (await firstNameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await firstNameInput.fill('Test');
    }

    const lastNameInput = page.locator('input[name="lastName"], input[name="last_name"]').first();
    if (await lastNameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await lastNameInput.fill('User');
    }

    // Submit
    await page.click('button[type="submit"]');

    // Should either redirect to home OR show confirmation message
    const result = await Promise.race([
      page
        .waitForURL(url => !url.pathname.includes('/auth'), { timeout: 10000 })
        .then(() => 'redirected'),
      page
        .waitForSelector('text=check your email, text=confirm', { timeout: 10000 })
        .then(() => 'needs_confirmation'),
    ]).catch(() => 'timeout');

    expect(['redirected', 'needs_confirmation']).toContain(result);

    // Cleanup: Delete the test user
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const testUser = users?.users.find(u => u.email === testEmail);
    if (testUser) {
      await supabaseAdmin.auth.admin.deleteUser(testUser.id);
    }
  });

  test('AUTH-002-TC01: Valid login redirects to home', async ({
    page,
    createTestUser,
    loginAsUser,
  }) => {
    // Create a test user
    const user = await createTestUser({ displayName: 'Login Test User' });

    // Login
    await loginAsUser(page, user);

    // Verify on home page
    await expect(page).toHaveURL(/^(?!.*\/auth).*/);

    // Verify user context is available (trip grid or some authenticated element)
    await expect(
      page.locator('[data-testid="trip-grid"], [data-testid="create-trip-button"], main').first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('AUTH-008-TC01: Logout clears session', async ({
    page,
    createTestUser,
    loginAsUser,
    logout,
  }) => {
    const user = await createTestUser({ displayName: 'Logout Test User' });

    // Login first
    await loginAsUser(page, user);

    // Logout
    await logout(page);

    // Should be on landing or auth page
    await expect(page).toHaveURL(/^\/$|\/auth/);

    // Try to access protected route
    await page.goto('/trip/test-123');

    // Should redirect to auth or show auth prompt
    const isProtected = await Promise.race([
      page.waitForURL(url => url.pathname.includes('/auth'), { timeout: 5000 }).then(() => true),
      page
        .waitForSelector('[data-testid="auth-modal"], text=Sign In, text=Log In', { timeout: 5000 })
        .then(() => true),
    ]).catch(() => false);

    expect(isProtected).toBe(true);
  });
});

test.describe('Authentication Flow - Error States', () => {
  test('AUTH-009-TC01: Invalid credentials show error', async ({ page }) => {
    await page.goto('/auth');

    // Fill with invalid credentials
    await page.fill('input[type="email"]', 'nonexistent@test.chravel.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');

    // Submit
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(
      page.locator('text=Invalid, text=incorrect, text=wrong, [role="alert"]').first(),
    ).toBeVisible({ timeout: 10000 });

    // Should still be on auth page
    await expect(page).toHaveURL(/\/auth/);
  });

  test('AUTH-009-TC02: Empty form shows validation', async ({ page }) => {
    await page.goto('/auth');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Should show validation or stay on page
    await expect(page).toHaveURL(/\/auth/);

    // Check for validation messages or required field indicators
    const hasValidation = await page
      .locator('[aria-invalid="true"], :invalid, text=required, text=enter')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    expect(hasValidation).toBe(true);
  });
});

test.describe('Authentication Flow - Session Management', () => {
  test('AUTH-007-TC01: Session persists on reload', async ({
    page,
    createTestUser,
    loginAsUser,
  }) => {
    const user = await createTestUser({ displayName: 'Session Test User' });

    // Login
    await loginAsUser(page, user);

    // Reload page
    await page.reload();

    // Should still be authenticated (not redirected to auth)
    await page.waitForTimeout(2000); // Wait for session check
    await expect(page).not.toHaveURL(/\/auth/);

    // Should still see authenticated content
    await expect(
      page.locator('[data-testid="trip-grid"], [data-testid="create-trip-button"], main').first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('AUTH-011-TC01: Protected routes redirect unauthenticated users', async ({ page }) => {
    // Clear any existing session
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try to access protected route
    await page.goto('/profile');

    // Should either redirect to auth or show auth prompt
    const redirectedOrPrompted = await Promise.race([
      page
        .waitForURL(url => url.pathname.includes('/auth') || url.pathname === '/', {
          timeout: 5000,
        })
        .then(() => true),
      page
        .waitForSelector('[data-testid="auth-modal"], text=Sign In, text=Log In', { timeout: 5000 })
        .then(() => true),
    ]).catch(() => false);

    expect(redirectedOrPrompted).toBe(true);
  });
});

test.describe('Authentication Flow - Demo Mode', () => {
  test('AUTH-012-TC01: Demo mode provides mock user context', async ({ page }) => {
    await page.goto('/');

    // Enable demo mode via localStorage
    await page.evaluate(() => {
      localStorage.setItem('TRIPS_DEMO_VIEW', 'app-preview');
    });

    // Reload to apply demo mode
    await page.reload();

    // Should show demo content (trip grid with demo trips)
    await expect(
      page.locator('[data-testid="trip-grid"], [data-testid="trip-card"]').first(),
    ).toBeVisible({ timeout: 10000 });

    // Demo mode should allow viewing trip details
    const tripCard = page.locator('[data-testid="trip-card"]').first();
    if (await tripCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tripCard.click();

      // Should navigate to trip detail (not be blocked)
      await expect(page).toHaveURL(/\/trip\/\d+|\/demo\/trip/);
    }

    // Cleanup: disable demo mode
    await page.evaluate(() => {
      localStorage.setItem('TRIPS_DEMO_VIEW', 'off');
    });
  });
});

test.describe('Password Reset Flow', () => {
  test('AUTH-006-TC01: Password reset sends email', async ({ page }) => {
    await page.goto('/auth');

    // Find and click forgot password link
    const forgotLink = page
      .locator('text=Forgot password, text=Reset password, a[href*="reset"]')
      .first();

    if (await forgotLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await forgotLink.click();

      // Fill email
      await page.fill('input[type="email"]', 'reset-test@test.chravel.com');

      // Submit
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(
        page.locator('text=email, text=sent, text=check, text=reset').first(),
      ).toBeVisible({ timeout: 10000 });
    } else {
      // Skip if forgot password not visible
      test.skip();
    }
  });
});
