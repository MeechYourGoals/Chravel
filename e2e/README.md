# Chravel E2E Test Suite

This directory contains comprehensive end-to-end tests for the Chravel application, designed to verify feature parity between demo mode and authenticated user experiences.

## 📁 Directory Structure

```
e2e/
├── fixtures/               # Playwright test fixtures
│   ├── auth.fixture.ts     # Authentication helpers (login, logout, user creation)
│   └── trip.fixture.ts     # Trip management helpers
├── specs/                  # Test specifications organized by feature
│   ├── auth/               # Authentication tests (AUTH-001 to AUTH-012)
│   ├── profile/            # Profile management tests
│   ├── trips/              # Trip CRUD tests (TRIP-001 to TRIP-017)
│   ├── invites/            # Invite flow tests (INVITE-001 to INVITE-017)
│   ├── chat/               # Chat functionality tests
│   ├── calendar/           # Calendar event tests
│   ├── tasks/              # Task management tests
│   ├── polls/              # Poll tests
│   ├── payments/           # Payment split tests
│   ├── media/              # Media upload tests
│   ├── export/             # PDF export tests
│   ├── subscriptions/      # Subscription tests
│   ├── pro/                # Pro trip tests
│   ├── events/             # Event tests
│   ├── organizations/      # Organization tests
│   └── rls/                # RLS permission tests
├── auth.spec.ts            # Legacy auth tests
├── chat.spec.ts            # Legacy chat tests
├── invite-links.spec.ts    # Legacy invite tests
├── offline-resilience.spec.ts
├── settings.spec.ts
├── trip-creation.spec.ts
└── trip-flow.spec.ts
```

## 🚀 Running Tests

### Prerequisites

1. **Environment Variables** - Copy `.env.example` to `.env` and configure:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For fixtures
   PLAYWRIGHT_TEST_BASE_URL=http://localhost:8080
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   npx playwright install
   ```

### Run All Tests

```bash
# Run all tests with dev server
npm run test:e2e

# Or manually
npx playwright test
```

### Run Specific Test Suites

```bash
# Authentication tests
npx playwright test e2e/specs/auth/

# Trip tests
npx playwright test e2e/specs/trips/

# RLS permission tests
npx playwright test e2e/specs/rls/

# Run a single test file
npx playwright test e2e/specs/auth/full-auth.spec.ts
```

### Run with UI Mode (Development)

```bash
npx playwright test --ui
```

### Run with Trace Viewer (Debugging)

```bash
npx playwright test --trace on
npx playwright show-trace test-results/artifacts/.../trace.zip
```

## 📊 Test Reports

After running tests, reports are generated in `test-results/`:

- `test-results/html-report/` - HTML report (open with `npx playwright show-report`)
- `test-results/results.json` - JSON report for CI integration
- `test-results/junit.xml` - JUnit XML for CI tools
- `test-results/artifacts/` - Screenshots, videos, traces on failure

## 🔧 Fixtures

### Auth Fixture (`fixtures/auth.fixture.ts`)

Provides utilities for authentication testing:

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test('my auth test', async ({ 
  createTestUser,   // Create a test user with confirmed email
  loginAsUser,      // Login via browser
  logout,           // Logout via browser
  cleanupUser,      // Delete user and all data
  supabaseAdmin,    // Service role client for admin ops
  supabaseAnon,     // Anon client for user-level ops
  getClientAsUser,  // Get authenticated client for a user
}) => {
  const user = await createTestUser({ displayName: 'Test User' });
  await loginAsUser(page, user);
  // ... test logic
  // User auto-cleaned up after test
});
```

### Trip Fixture (`fixtures/trip.fixture.ts`)

Extends auth fixture with trip management:

```typescript
import { test, expect } from '../fixtures/trip.fixture';

test('my trip test', async ({
  createTestUser,
  createTestTrip,      // Create a trip for a user
  addTripMember,       // Add member to trip
  createInviteLink,    // Generate invite link
  addChatMessage,      // Add chat message
  addTripEvent,        // Add calendar event
  addTripTask,         // Add task
  cleanupTrip,         // Delete trip and all data
}) => {
  const user = await createTestUser();
  const trip = await createTestTrip(user, { name: 'Test Trip' });
  // ... test logic
  // All data auto-cleaned up after test
});
```

## 🧪 Test ID Convention

Tests follow a consistent naming scheme matching the QA Parity Audit document:

- **Feature ID**: `AUTH-001`, `TRIP-002`, `CHAT-005`, etc.
- **Test Case ID**: `AUTH-001-TC01`, `TRIP-002-TC02`, etc.

Example:
```typescript
test('AUTH-001-TC01: Email/password signup creates account', async () => {
  // Test implementation
});
```

## 📋 Coverage Areas

| Area | Test IDs | Status |
|------|----------|--------|
| Authentication | AUTH-001 to AUTH-012 | ✅ Implemented |
| Profile | PROFILE-001 to PROFILE-010 | 🔄 Planned |
| Trips | TRIP-001 to TRIP-017 | ✅ Implemented |
| Invites | INVITE-001 to INVITE-017 | 🔄 Planned |
| Chat | CHAT-001 to CHAT-018 | 🔄 Planned |
| Calendar | CALENDAR-001 to CALENDAR-016 | 🔄 Planned |
| Tasks | TASK-001 to TASK-012 | 🔄 Planned |
| Polls | POLL-001 to POLL-009 | 🔄 Planned |
| Media | MEDIA-001 to MEDIA-012 | 🔄 Planned |
| Payments | PAYMENT-001 to PAYMENT-017 | 🔄 Planned |
| Export | EXPORT-001 to EXPORT-012 | 🔄 Planned |
| Subscriptions | SUB-001 to SUB-009 | 🔄 Planned |
| Pro Trips | PRO-001 to PRO-012 | 🔄 Planned |
| Events | EVENT-001 to EVENT-007 | 🔄 Planned |
| Organizations | ORG-001 to ORG-010 | 🔄 Planned |
| RLS Policies | RLS-* | ✅ Implemented |

## 🔐 RLS Testing

The `specs/rls/` directory contains tests that validate Row Level Security policies:

```typescript
test('RLS-TRIP-001: Non-member cannot read trip', async ({
  createTestUser,
  createTestTrip,
  getClientAsUser,
}) => {
  const userA = await createTestUser();
  const userB = await createTestUser();
  
  // User A creates trip
  const trip = await createTestTrip(userA);
  
  // User B tries to read (should fail via RLS)
  const clientB = await getClientAsUser(userB);
  const { data } = await clientB
    .from('trips')
    .select('*')
    .eq('id', trip.id)
    .single();
  
  expect(data).toBeNull(); // RLS blocks access
});
```

## 🔗 Related Documentation

- [QA Parity Audit](../docs/QA_PARITY_AUDIT.md) - Full test map and tracking schema
- [CLAUDE.md](../CLAUDE.md) - Engineering standards
- [Playwright Docs](https://playwright.dev/docs/intro)

## ⚠️ Important Notes

1. **Service Role Key**: The `SUPABASE_SERVICE_ROLE_KEY` is required for test fixtures that create/delete users and data. Never commit this key to version control.

2. **Test Isolation**: Each test should be independent. Fixtures automatically clean up created data after each test.

3. **Demo Mode**: Some tests verify demo mode behavior. These don't require database credentials.

4. **CI Environment**: On CI, tests run with `--workers=1` for stability. Consider parallel execution carefully.

5. **Flaky Tests**: If a test is flaky, add it to the `test.skip()` list temporarily and investigate before committing.
