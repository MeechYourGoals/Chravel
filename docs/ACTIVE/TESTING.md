# Testing Infrastructure

This document describes the comprehensive testing infrastructure for Chravel.

## Overview

- **Unit Tests**: Vitest with React Testing Library
- **Integration Tests**: Vitest with mocked Supabase
- **E2E Tests**: Playwright
- **Coverage**: V8 coverage provider with HTML reports

## Test Structure

```
src/
  __tests__/
    utils/
      testHelpers.tsx      # Test utilities, factories, custom render
      supabaseMocks.ts      # Supabase client mocks
    auth.test.tsx           # Authentication flow tests
    trip-creation-flow.test.tsx  # Trip creation → invite → join
    chat-flow.test.tsx      # Chat message send → receive
    payment-balance.test.tsx     # Payment split → balance calculation
    calendar-conflict.test.tsx   # Calendar event → conflict detection
  components/__tests__/    # Component-specific tests
  services/__tests__/      # Service layer tests
  hooks/__tests__/         # Hook tests
  pages/__tests__/         # Page component tests

e2e/
  auth.spec.ts             # E2E authentication tests
  trip-flow.spec.ts        # E2E trip creation flow
```

## Running Tests

### Unit Tests

```bash
# Run all tests in watch mode
npm run test

# Run tests once
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run specific test file
npm run test src/__tests__/auth.test.tsx
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Debug E2E tests
npm run test:e2e:debug

# Run specific E2E test
npx playwright test e2e/auth.spec.ts
```

## Test Utilities

### `testHelpers.tsx`

Provides:
- `customRender`: Render function with all providers (QueryClient, Router, Auth)
- `testFactories`: Factory functions for creating test data (users, trips, messages, etc.)
- `mockGoogleMaps`: Mock Google Maps API
- `waitForAsync`: Helper for async updates

### `supabaseMocks.ts`

Provides:
- `createMockSupabaseClient()`: Creates a mock Supabase client
- `mockSupabase`: Default mock instance
- `supabaseMockHelpers`: Helper methods for setting mock data/errors

Example:
```typescript
import { mockSupabase, supabaseMockHelpers } from './utils/supabaseMocks';

beforeEach(() => {
  supabaseMockHelpers.clearMocks();
  supabaseMockHelpers.setMockData('trips', [{ id: 'trip-1', name: 'Test Trip' }]);
});
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { testFactories } from './utils/testHelpers';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const user = testFactories.createUser();
    render(<MyComponent user={user} />);
    expect(screen.getByText(user.displayName)).toBeInTheDocument();
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should create a trip', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Create Trip');
  await page.fill('[name="tripName"]', 'Paris Adventure');
  await page.click('text=Create');
  await expect(page).toHaveURL(/\/trip\/.+/);
});
```

## Coverage

Coverage reports are generated in `coverage/` directory:
- `coverage/index.html`: HTML coverage report
- `coverage/coverage-final.json`: JSON coverage data
- `coverage/lcov.info`: LCOV format

Coverage thresholds (in `vitest.config.ts`):
- Lines: 50%
- Functions: 50%
- Branches: 50%
- Statements: 50%

## CI/CD

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests

The CI pipeline:
1. Lints code
2. Type checks
3. Runs unit tests with coverage
4. Uploads coverage to Codecov
5. Runs E2E tests (on PRs and main branch)
6. Builds the application

## Critical Path Tests

The following critical user flows are tested:

1. **Authentication**
   - User signup
   - User login
   - User logout
   - Error handling

2. **Trip Creation → Invite → Join**
   - Create new trip
   - Generate invite link
   - Add collaborators
   - Join trip via invite link
   - Handle expired invites

3. **Chat Messages**
   - Send message
   - Receive messages in real-time
   - Handle send errors
   - Message reactions

4. **Payment Splits**
   - Calculate balances for split payments
   - Handle equal splits
   - Multi-currency support
   - Settled payments

5. **Calendar Events**
   - Create events
   - Detect conflicts
   - Handle overlapping events
   - Back-to-back events
   - All-day events

## Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Mock external dependencies (Supabase, APIs)
3. **Factories**: Use test factories for consistent test data
4. **Cleanup**: Clear mocks in `beforeEach`
5. **Assertions**: Use specific assertions (`toBeInTheDocument()` vs `toBeTruthy()`)
6. **Async**: Always await async operations
7. **Accessibility**: Test with screen readers in mind

## Troubleshooting

### Tests failing with "Cannot find module"
- Run `npm install` to ensure all dependencies are installed
- Check that `vitest.config.ts` has correct path aliases

### E2E tests timing out
- Increase timeout in `playwright.config.ts`
- Check that dev server is running on correct port
- Verify `PLAYWRIGHT_TEST_BASE_URL` is set correctly

### Coverage not generating
- Ensure `@vitest/coverage-v8` is installed
- Check `vitest.config.ts` coverage configuration
- Run `npm run test:coverage` explicitly

## Next Steps

- [ ] Add more component tests
- [ ] Increase coverage thresholds
- [ ] Add visual regression tests
- [ ] Add performance tests
- [ ] Add accessibility tests (axe-core)
