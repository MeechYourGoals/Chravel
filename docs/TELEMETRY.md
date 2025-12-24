# Telemetry & Analytics

> **Module:** `src/telemetry/`  
> **Last Updated:** 2024-12-23

This document describes Chravel's analytics and crash reporting system, including how to add new events, configure providers, and best practices.

---

## 📊 Overview

The telemetry module provides:

- **Product Analytics** - Track user behavior (signups, trip creation, engagement)
- **Crash Reporting** - Capture and report errors with context
- **Performance Monitoring** - Measure load times and render performance
- **Provider Abstraction** - Swap analytics providers without code changes

### Provider Options (Early-Stage Startup Comparison)

| Provider | Type | Free Tier | Best For |
|----------|------|-----------|----------|
| **PostHog** (Recommended) | Analytics + Crash | 1M events/mo | All-in-one, open-source |
| **Mixpanel** | Analytics | 20M events/mo | Deep product analytics |
| **Sentry** | Crash Reporting | 5K errors/mo | Error tracking, stack traces |
| **Amplitude** | Analytics | 10M events/mo | Growth analytics |
| **Segment** | Data Pipeline | 1K users/mo | Multi-destination routing |

**Our Choice:** PostHog is implemented as the primary provider because:
- Single SDK for web + mobile (Capacitor-compatible)
- Open-source with self-hosting option
- Includes session recording, feature flags
- GDPR compliant with EU hosting

---

## 🚀 Quick Start

### 1. Initialize Telemetry

In `App.tsx` or your root component:

```tsx
import { useEffect } from 'react';
import { telemetry, startAppLoadTiming, reportAppLoaded } from '@/telemetry';

// Start timing as early as possible
startAppLoadTiming();

function App() {
  useEffect(() => {
    // Initialize telemetry
    telemetry.init();
    
    // Report app loaded when ready
    reportAppLoaded();
  }, []);

  return <AppContent />;
}
```

### 2. Track Events

Use the type-safe event helpers:

```tsx
import { authEvents, tripEvents, messageEvents } from '@/telemetry';

// Auth events
authEvents.signupCompleted('email', user.id);
authEvents.loginFailed('google', 'OAuth error');

// Trip events
tripEvents.created({
  trip_id: trip.id,
  trip_type: 'consumer',
  has_dates: true,
  has_location: true,
  member_count: 5
});

// Message events
messageEvents.sent({
  trip_id: tripId,
  message_type: 'text',
  has_media: false,
  character_count: 42,
  is_offline_queued: false
});
```

### 3. Capture Errors

```tsx
import { telemetry } from '@/telemetry';

try {
  await riskyOperation();
} catch (error) {
  telemetry.captureError(error as Error, {
    context: 'PaymentFlow',
    user_id: user.id,
    trip_id: tripId
  });
}
```

### 4. Track Page Views

Use the hook in your layout:

```tsx
import { usePageTracking } from '@/telemetry';

function AppLayout({ children }) {
  usePageTracking(); // Automatic page view tracking
  
  return <>{children}</>;
}
```

---

## 📋 Event Schema

All events are strongly typed in `src/telemetry/types.ts`. Here's the complete schema:

### Authentication Events

| Event | Properties | When to Track |
|-------|------------|---------------|
| `signup_started` | `method` | User initiates signup |
| `signup_completed` | `method`, `user_id` | Signup successful |
| `signup_failed` | `method`, `error` | Signup error |
| `login_started` | `method` | User initiates login |
| `login_completed` | `method`, `user_id` | Login successful |
| `login_failed` | `method`, `error` | Login error |
| `logout` | `user_id` | User logs out |

### Trip Events

| Event | Properties | When to Track |
|-------|------------|---------------|
| `trip_create_started` | (none) | User opens create trip modal |
| `trip_created` | `trip_id`, `trip_type`, `has_dates`, `has_location`, `member_count` | Trip saved |
| `trip_create_failed` | `error` | Trip creation error |
| `trip_join_started` | `trip_id`, `method` | User clicks join link |
| `trip_joined` | `trip_id`, `method`, `user_id` | Join successful |
| `trip_join_failed` | `trip_id`, `method`, `error` | Join error |
| `trip_viewed` | `trip_id`, `trip_type` | User opens trip |
| `trip_archived` | `trip_id` | User archives trip |

### Messaging Events

| Event | Properties | When to Track |
|-------|------------|---------------|
| `message_sent` | `trip_id`, `message_type`, `has_media`, `character_count`, `is_offline_queued` | Message sent |
| `message_send_failed` | `trip_id`, `error` | Send error |

### Places Events

| Event | Properties | When to Track |
|-------|------------|---------------|
| `place_pinned` | `trip_id`, `place_id`, `category`, `source` | User saves/pins place |
| `place_unpinned` | `trip_id`, `place_id` | User removes place |
| `place_searched` | `trip_id`, `query`, `results_count` | Search executed |

### Poll Events

| Event | Properties | When to Track |
|-------|------------|---------------|
| `poll_created` | `trip_id`, `poll_id`, `options_count`, `allow_multiple`, `has_deadline` | Poll created |
| `poll_voted` | `trip_id`, `poll_id`, `options_selected` | User votes |
| `poll_vote_changed` | `trip_id`, `poll_id` | User changes vote |
| `poll_closed` | `trip_id`, `poll_id`, `total_votes` | Poll closed |

### Task Events

| Event | Properties | When to Track |
|-------|------------|---------------|
| `task_created` | `trip_id`, `task_id`, `has_due_date`, `is_poll`, `assigned_count` | Task created |
| `task_completed` | `trip_id`, `task_id`, `time_to_complete_ms` | User completes task |
| `task_uncompleted` | `trip_id`, `task_id` | User unchecks task |
| `task_deleted` | `trip_id`, `task_id` | Task deleted |

### Export Events

| Event | Properties | When to Track |
|-------|------------|---------------|
| `export_recap_started` | `trip_id`, `sections_selected` | User starts export |
| `export_recap_completed` | `trip_id`, `sections_exported`, `duration_ms`, `file_size_kb` | Export successful |
| `export_recap_failed` | `trip_id`, `error` | Export error |

### Performance Events

| Event | Properties | When to Track |
|-------|------------|---------------|
| `app_loaded` | `duration_ms`, `is_cached`, `network_type` | App fully interactive |
| `chat_render` | `trip_id`, `message_count`, `duration_ms` | Chat messages rendered |
| `page_view` | `page`, `trip_id`, `load_time_ms` | Page navigation |

---

## 🔧 Adding New Events

### Step 1: Define the Event Type

Add to `src/telemetry/types.ts`:

```typescript
export interface FeatureEvents {
  feature_action: {
    feature_id: string;
    action_type: 'click' | 'hover' | 'scroll';
    metadata?: Record<string, unknown>;
  };
}

// Add to TelemetryEventMap
export type TelemetryEventMap = AuthEvents &
  TripEvents &
  // ... existing events
  FeatureEvents; // Add your new event interface
```

### Step 2: Add Helper Function (Optional)

Add to `src/telemetry/events.ts`:

```typescript
export const featureEvents = {
  action: (
    featureId: string,
    actionType: 'click' | 'hover' | 'scroll',
    metadata?: Record<string, unknown>
  ) => {
    telemetry.track('feature_action', {
      feature_id: featureId,
      action_type: actionType,
      metadata
    });
  },
};
```

### Step 3: Export from Index

Add to `src/telemetry/index.ts`:

```typescript
export { featureEvents } from './events';
```

### Step 4: Use in Components

```tsx
import { featureEvents } from '@/telemetry';

function MyFeature() {
  const handleClick = () => {
    featureEvents.action('my-feature', 'click', { button: 'primary' });
  };
  
  return <button onClick={handleClick}>Click Me</button>;
}
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# PostHog (recommended)
VITE_POSTHOG_API_KEY=phc_xxxx
VITE_POSTHOG_HOST=https://app.posthog.com

# Sentry (optional, for enhanced crash reporting)
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# App version (for release tracking)
VITE_APP_VERSION=1.0.0
```

### Runtime Configuration

```typescript
import { telemetry } from '@/telemetry';

await telemetry.init({
  enabled: true,
  environment: 'production',
  debug: false,
  performanceSampleRate: 0.1, // Sample 10% of perf events
  posthog: {
    apiKey: 'your-key',
    apiHost: 'https://app.posthog.com'
  },
  sentry: {
    dsn: 'your-dsn',
    tracesSampleRate: 0.1
  }
});
```

---

## 📱 iOS / Capacitor Support

The telemetry module automatically detects Capacitor and uses the appropriate SDKs:

- **Web:** `posthog-js`, `@sentry/react`
- **iOS/Android:** `posthog-react-native`, `@sentry/capacitor`

Crash reporting on iOS captures:
- Native crashes (Swift/Objective-C)
- JavaScript errors in WebView
- Network errors
- ANRs (Application Not Responding)

---

## 🔒 Privacy & Compliance

### Data Handling

- **Demo Mode:** Events are NOT sent when `TRIPS_DEMO_MODE=true`
- **PII:** Never include email, phone, or names in event properties
- **User ID:** Use the Supabase UUID, not email
- **GDPR:** PostHog supports EU hosting and data retention policies

### Opt-Out

Users can opt out of analytics in Settings. Check before tracking:

```typescript
const { notificationSettings } = useAuth();

if (notificationSettings.analytics !== false) {
  tripEvents.created({ ... });
}
```

---

## 🐛 Debugging

### Enable Debug Mode

```typescript
await telemetry.init({ debug: true });
```

This logs all events to the console with `[Telemetry:*]` prefix.

### Check Initialization Status

```typescript
if (telemetry.isEnabled()) {
  console.log('Telemetry is active');
}
```

### View PostHog Events

1. Open PostHog dashboard
2. Go to Events → Live Events
3. Filter by user or event name

---

## 📊 Common Patterns

### Track Time-to-Action

```typescript
import { useOperationTiming } from '@/telemetry';

function CheckoutFlow() {
  const { startTiming, endTiming } = useOperationTiming('checkout');
  
  useEffect(() => {
    startTiming(); // Start when component mounts
  }, []);
  
  const handleComplete = () => {
    const duration = endTiming();
    tripEvents.created({ ..., checkout_duration_ms: duration });
  };
}
```

### Track Chat Performance

```typescript
import { useChatPerformance } from '@/telemetry';

function TripChat({ tripId, messages, isLoading }) {
  useChatPerformance(tripId, messages, isLoading);
  
  return <ChatMessages messages={messages} />;
}
```

### Capture Async Errors

```typescript
import { telemetry } from '@/telemetry';

const fetchWithTracking = async (url: string) => {
  try {
    return await fetch(url);
  } catch (error) {
    telemetry.captureError(error as Error, { url });
    throw error;
  }
};
```

---

## 📝 Best Practices

1. **Be Consistent** - Use the same property names across related events
2. **Don't Over-Track** - Focus on actionable metrics
3. **Use Helpers** - Prefer `tripEvents.created()` over `telemetry.track()`
4. **Add Context** - Include `trip_id` when relevant for segmentation
5. **Handle Errors** - Wrap risky operations in try/catch with `captureError`
6. **Test Locally** - Use `debug: true` to verify events fire correctly
7. **Document Events** - Add new events to this doc when created

---

## 🔗 Related Documentation

- [PostHog Docs](https://posthog.com/docs)
- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Capacitor Plugin Guide](https://capacitorjs.com/docs/plugins)
