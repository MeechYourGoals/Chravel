/**
 * Authentication Fixtures for E2E Testing
 * 
 * Provides utilities for creating, managing, and cleaning up test users.
 * Uses Supabase service role for administrative operations.
 */

/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable no-empty-pattern */

import { test as base, Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types
interface TestUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
}

interface AuthFixtures {
  /**
   * Supabase client with service role (for admin operations)
   */
  supabaseAdmin: SupabaseClient;
  
  /**
   * Supabase client as anonymous/user role
   */
  supabaseAnon: SupabaseClient;
  
  /**
   * Create a new test user
   */
  createTestUser: (options?: {
    email?: string;
    displayName?: string;
    isPro?: boolean;
  }) => Promise<TestUser>;
  
  /**
   * Login as a test user in the browser
   */
  loginAsUser: (page: Page, user: TestUser) => Promise<void>;
  
  /**
   * Logout current user in the browser
   */
  logout: (page: Page) => Promise<void>;
  
  /**
   * Cleanup test user and all associated data
   */
  cleanupUser: (userId: string) => Promise<void>;
  
  /**
   * Get authenticated Supabase client for a user
   */
  getClientAsUser: (user: TestUser) => Promise<SupabaseClient>;
}

// Environment validation (lenient - allows tests to be listed without env vars)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Only warn if missing - errors will happen when fixtures are actually used
if (!SUPABASE_URL) {
  console.warn('[E2E Fixtures] SUPABASE_URL not set - database fixtures will not work');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[E2E Fixtures] SUPABASE_SERVICE_ROLE_KEY not set - admin fixtures will not work');
}

if (!SUPABASE_ANON_KEY) {
  console.warn('[E2E Fixtures] SUPABASE_ANON_KEY not set - user fixtures will not work');
}

/**
 * Generate a unique test email
 */
const generateTestEmail = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `qa-${timestamp}-${random}@test.chravel.com`;
};

/**
 * Default test password (complex enough to pass validation)
 */
const DEFAULT_TEST_PASSWORD = 'TestPassword123!QA';

/**
 * Extended test with auth fixtures
 */
export const test = base.extend<AuthFixtures>({
  supabaseAdmin: async ({}, use) => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for admin operations');
    }
    
    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    await use(client);
  },
  
  supabaseAnon: async ({}, use) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY required for anon operations');
    }
    
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    await use(client);
  },
  
  createTestUser: async ({ supabaseAdmin }, use) => {
    const createdUsers: string[] = [];
    
    const createUser = async (options?: {
      email?: string;
      displayName?: string;
      isPro?: boolean;
    }): Promise<TestUser> => {
      const email = options?.email || generateTestEmail();
      const displayName = options?.displayName || `QA User ${Date.now()}`;
      const password = DEFAULT_TEST_PASSWORD;
      
      // Create auth user with confirmed email
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          first_name: 'QA',
          last_name: 'Test',
        },
      });
      
      if (authError) {
        throw new Error(`Failed to create test user: ${authError.message}`);
      }
      
      const userId = authData.user.id;
      createdUsers.push(userId);
      
      // Ensure profile exists
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        user_id: userId,
        display_name: displayName,
        email,
        first_name: 'QA',
        last_name: 'Test',
      }, { onConflict: 'user_id' });
      
      if (profileError) {
        console.warn(`Failed to create profile (non-fatal): ${profileError.message}`);
      }
      
      // If isPro, add pro role
      if (options?.isPro) {
        await supabaseAdmin.from('user_roles').insert({
          user_id: userId,
          role: 'pro',
        });
      }
      
      return {
        id: userId,
        email,
        password,
        displayName,
      };
    };
    
    await use(createUser);
    
    // Cleanup all created users after test
    for (const userId of createdUsers) {
      try {
        // Delete in order respecting foreign keys
        await supabaseAdmin.from('trip_members').delete().eq('user_id', userId);
        await supabaseAdmin.from('trip_join_requests').delete().eq('user_id', userId);
        await supabaseAdmin.from('organization_members').delete().eq('user_id', userId);
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
        await supabaseAdmin.from('profiles').delete().eq('user_id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (error) {
        console.warn(`Failed to cleanup user ${userId}:`, error);
      }
    }
  },
  
  loginAsUser: async ({}, use) => {
    const login = async (page: Page, user: TestUser): Promise<void> => {
      await page.goto('/auth');
      
      // Wait for auth page to load
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
      
      // Fill email
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      await emailInput.fill(user.email);
      
      // Fill password
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      await passwordInput.fill(user.password);
      
      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first();
      await submitButton.click();
      
      // Wait for navigation away from auth page
      await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 15000 });
      
      // Verify logged in (session exists)
      await page.waitForFunction(() => {
        // Check for authenticated state indicators
        return document.querySelector('[data-testid="user-avatar"]') !== null ||
               document.querySelector('[data-testid="trip-grid"]') !== null ||
               !document.querySelector('[data-testid="sign-in-button"]');
      }, { timeout: 10000 });
    };
    
    await use(login);
  },
  
  logout: async ({}, use) => {
    const logout = async (page: Page): Promise<void> => {
      // Try to find and click logout button
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout-button"]').first();
      
      if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logoutButton.click();
      } else {
        // Navigate to settings and logout
        await page.goto('/settings');
        const settingsLogout = page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
        await settingsLogout.click();
      }
      
      // Wait for redirect to landing/auth
      await page.waitForURL(url => url.pathname === '/' || url.pathname.includes('/auth'), { timeout: 10000 });
    };
    
    await use(logout);
  },
  
  cleanupUser: async ({ supabaseAdmin }, use) => {
    const cleanup = async (userId: string): Promise<void> => {
      try {
        // Delete user's trips (as creator)
        const { data: userTrips } = await supabaseAdmin
          .from('trips')
          .select('id')
          .eq('creator_id', userId);
        
        if (userTrips) {
          for (const trip of userTrips) {
            // Delete trip members
            await supabaseAdmin.from('trip_members').delete().eq('trip_id', trip.id);
            // Delete trip
            await supabaseAdmin.from('trips').delete().eq('id', trip.id);
          }
        }
        
        // Delete memberships
        await supabaseAdmin.from('trip_members').delete().eq('user_id', userId);
        await supabaseAdmin.from('trip_join_requests').delete().eq('user_id', userId);
        await supabaseAdmin.from('organization_members').delete().eq('user_id', userId);
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
        await supabaseAdmin.from('notification_preferences').delete().eq('user_id', userId);
        await supabaseAdmin.from('push_tokens').delete().eq('user_id', userId);
        await supabaseAdmin.from('profiles').delete().eq('user_id', userId);
        
        // Delete auth user
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (error) {
        console.warn(`Cleanup error for user ${userId}:`, error);
      }
    };
    
    await use(cleanup);
  },
  
  getClientAsUser: async ({}, use) => {
    const getClient = async (user: TestUser): Promise<SupabaseClient> => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY required');
      }
      
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      
      const { error } = await client.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });
      
      if (error) {
        throw new Error(`Failed to authenticate as user: ${error.message}`);
      }
      
      return client;
    };
    
    await use(getClient);
  },
});

export { expect } from '@playwright/test';
export type { TestUser };
