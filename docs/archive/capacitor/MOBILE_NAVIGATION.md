# Mobile Navigation Architecture

## Overview
Chravel's mobile experience uses Capacitor for native functionality with a custom navigation system optimized for iOS and Android platforms. This document outlines the architecture, deep linking strategy, and state management for mobile navigation.

## Navigation System

### Bottom Tab Bar (`MobileBottomNav.tsx`)
**Location:** `src/components/mobile/MobileBottomNav.tsx`

The persistent bottom navigation provides access to core features:
- **Home** → `/` (Trip list/dashboard)
- **Calendar** → `/calendar` (Cross-trip calendar view)
- **Chat** → `/chat` (Unified messaging)
- **Enterprise** → `/mobile/enterprise` (Organization management - Pro only)

**Key Features:**
- Haptic feedback on tab press (`@capacitor/haptics`)
- Active state indication with gradient backgrounds
- Safe area insets for notched devices
- Icon-first design with labels

### Deep Linking Schema

#### Trip Context Routes
```
chravel://trip/{tripId}                 → Trip detail view
chravel://trip/{tripId}/chat            → Trip chat tab
chravel://trip/{tripId}/calendar        → Trip calendar tab
chravel://trip/{tripId}/tasks           → Trip tasks tab
chravel://trip/{tripId}/polls           → Trip polls tab
chravel://trip/{tripId}/media           → Trip media hub
```

#### Enterprise Routes (Pro)
```
chravel://enterprise                    → Mobile enterprise hub
chravel://enterprise/org/{orgId}        → Organization detail view
chravel://enterprise/invite/{token}     → Organization invite acceptance
```

#### Authentication Routes
```
chravel://auth/login                    → Mobile-optimized login
chravel://auth/signup                   → Mobile-optimized signup
chravel://auth/magic-link               → Magic link handler
chravel://auth/reset-password           → Password reset flow
```

#### Universal Concierge
```
chravel://concierge                     → Universal concierge interface
chravel://concierge?query={text}        → Pre-filled query
```

## State Management

### Navigation Stack
- Uses `react-router-dom` for routing
- `useNavigate()` for programmatic navigation
- `useLocation()` for route state tracking
- Browser history API for back navigation

### Tab Bar State
```typescript
// Current active tab stored in route state
const location = useLocation();
const activeTab = location.pathname.split('/')[1] || 'home';
```

### Persistence Strategy
- **Session Storage:** Active trip ID, last viewed tab
- **Local Storage:** User preferences, offline data
- **Supabase Realtime:** Live data synchronization

## Authentication Flows

### Login/Signup
1. User accesses protected route
2. Redirect to `/auth/login` with return URL
3. After auth success, restore previous location
4. Auto-join trip if invite link was used

### Session Management
```typescript
// Check auth status on app resume
Capacitor.Plugins.App.addListener('appStateChange', (state) => {
  if (state.isActive) {
    supabase.auth.refreshSession();
  }
});
```

### Biometric Auth (Future)
- iOS Face ID / Touch ID
- Android Fingerprint / Face Unlock
- Stored in iOS Keychain / Android Keystore

## Offline-First Strategy

### Data Caching
- **Trip Data:** Cached for 24 hours in IndexedDB
- **Messages:** Last 500 messages per trip
- **Media:** Thumbnails only (full resolution on demand)
- **Tasks:** Full task list with status

### Sync Strategy
```typescript
// On reconnection
if (navigator.onLine) {
  syncQueue.flush(); // Send pending changes
  refreshData();     // Pull latest updates
}
```

### Conflict Resolution
- Last-write-wins for simple updates
- Optimistic UI with rollback on conflict
- Server-side conflict detection via version numbers

## Push Notifications

### Notification Categories
```typescript
enum NotificationCategory {
  CHAT_MESSAGE = 'chat_message',
  TASK_ASSIGNED = 'task_assigned',
  POLL_CREATED = 'poll_created',
  TRIP_INVITE = 'trip_invite',
  BROADCAST = 'broadcast',
  PAYMENT_REQUEST = 'payment_request'
}
```

### Deep Link Routing
```typescript
// Handle notification tap
PushNotifications.addListener('notificationActionPerformed', (notification) => {
  const { tripId, type, resourceId } = notification.data;
  
  switch (type) {
    case 'chat_message':
      navigate(`/trip/${tripId}/chat`);
      break;
    case 'task_assigned':
      navigate(`/trip/${tripId}/tasks?highlight=${resourceId}`);
      break;
    case 'trip_invite':
      navigate(`/trip/${tripId}`);
      break;
  }
});
```

### Notification Permissions
- Request on first app launch
- Show rationale before requesting
- Graceful degradation if denied

## Platform-Specific Considerations

### iOS
- **Safe Areas:** Honor notch/Dynamic Island
- **Gestures:** Swipe-back from left edge
- **Status Bar:** Dynamic color based on theme
- **App Store Guidelines:** No external payment links

### Android
- **Back Button:** Hardware back support
- **Share Target:** Register as share destination
- **Adaptive Icons:** Support for different launcher shapes
- **Material Design:** Follow Material 3 guidelines

## Performance Optimizations

### Route-Based Code Splitting
```typescript
const MobileOrganizationPage = lazy(() => import('./pages/MobileOrganizationPage'));
```

### Image Optimization
- Use `<img loading="lazy">` for off-screen images
- WebP format with JPEG fallback
- Responsive image sizes via `srcset`

### Animation Performance
- Use `transform` instead of `top/left`
- Avoid layout thrashing
- Hardware acceleration via `will-change`

## Troubleshooting

### Common Issues

**Deep links not working:**
- Verify `capacitor.config.ts` has correct `appUrlOpen` handler
- Check iOS Associated Domains / Android App Links setup
- Test with `npx cap open ios/android` and Xcode/Android Studio logs

**Navigation stuck:**
- Clear route history: `navigate('/', { replace: true })`
- Reset navigation stack on logout
- Check for circular route dependencies

**Tab bar not updating:**
- Ensure `useLocation()` is in component tree
- Verify route paths match tab IDs
- Check for route state mutations

## Testing Strategy

### Manual Testing Checklist
- [ ] All tabs navigate correctly
- [ ] Deep links open appropriate screens
- [ ] Back button behavior (Android)
- [ ] Push notification taps route correctly
- [ ] Offline mode shows cached data
- [ ] Authentication redirects work
- [ ] Safe area insets respected

### Automated Tests
```typescript
// Example navigation test
describe('MobileBottomNav', () => {
  it('navigates to enterprise on tab press', async () => {
    const { getByText } = render(<MobileBottomNav />);
    fireEvent.click(getByText('Enterprise'));
    expect(window.location.pathname).toBe('/mobile/enterprise');
  });
});
```

## Future Enhancements

### Planned Features
1. **Gesture Navigation:** Swipe between tabs
2. **Widget Support:** iOS home screen widget for trip countdown
3. **Apple Watch Companion:** Quick task completion
4. **Android Shortcuts:** Long-press app icon actions
5. **Voice Commands:** "Hey Siri, check my trip tasks"

### Architecture Evolution
- Consider React Navigation for more complex flows
- Evaluate native navigation (Swift/Kotlin) for performance-critical paths
- Add analytics tracking for navigation events

---

**Last Updated:** 2025-10-05  
**Owner:** Chravel Engineering Team  
**Review Cycle:** Quarterly or on major mobile updates
