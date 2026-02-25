import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Chravel E2E Test Configuration
 *
 * See https://playwright.dev/docs/test-configuration.
 *
 * Test Structure:
 * - e2e/specs/auth/        - Authentication tests
 * - e2e/specs/profile/     - Profile management tests
 * - e2e/specs/trips/       - Trip CRUD tests
 * - e2e/specs/invites/     - Invite flow tests
 * - e2e/specs/chat/        - Chat functionality tests
 * - e2e/specs/calendar/    - Calendar event tests
 * - e2e/specs/tasks/       - Task management tests
 * - e2e/specs/polls/       - Poll tests
 * - e2e/specs/payments/    - Payment split tests
 * - e2e/specs/media/       - Media upload tests
 * - e2e/specs/export/      - PDF export tests
 * - e2e/specs/subscriptions/ - Subscription tests
 * - e2e/specs/pro/         - Pro trip tests
 * - e2e/specs/events/      - Event tests
 * - e2e/specs/organizations/ - Org tests
 * - e2e/specs/rls/         - RLS permission tests
 */
export default defineConfig({
  testDir: './e2e',

  /* Test timeout: 30 seconds per test */
  timeout: 30 * 1000,

  /* Expect timeout: 10 seconds for assertions */
  expect: {
    timeout: 10 * 1000,
  },

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI for stability. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter configuration */
  reporter: process.env.CI
    ? [
        ['html', { outputFolder: 'test-results/html-report' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
      ]
    : [['list']],

  /* Output directory for test artifacts */
  outputDir: 'test-results/artifacts',

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8080',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure for debugging */
    video: process.env.CI ? 'on-first-retry' : 'off',

    /* Action timeout */
    actionTimeout: 10 * 1000,

    /* Navigation timeout */
    navigationTimeout: 30 * 1000,
  },

  /* Configure projects for major browsers and devices */
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile browsers (uncomment to enable)
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    // RLS-specific tests (uses service role, no browser needed for some)
    {
      name: 'rls',
      testMatch: /specs\/rls\/.*.spec.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: process.env.CI
      ? 'npm run build && npm run preview -- --host 127.0.0.1 --port 8080 --strictPort'
      : 'npm run dev -- --host 127.0.0.1 --port 8080 --strictPort',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
  },

  /* Global setup/teardown */
  // globalSetup: './e2e/global-setup.ts',
  // globalTeardown: './e2e/global-teardown.ts',
});
