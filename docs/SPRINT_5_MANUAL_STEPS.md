# Sprint 5: Performance & UX - Testing & Optimization Guide

## Status

✅ **Implementation Audited**:
- Cold start optimizations (lazy loading, code splitting, retry mechanism)
- Bundle size optimizations (manual chunks, terser, CSS minification)
- Virtualized lists (VirtualizedMessageContainer, useVirtualScroll)
- JavaScript execution optimizations (console.log removal, minification)
- iOS bundle configuration (code signing, versioning)
- Offline mode (comprehensive queue system, sync service)
- Haptic feedback (complete native integration)

⚠️ **Performance Testing Required**:
- Measure cold start time (<3s target)
- Measure trip page load time (<2s target)
- Verify virtualization under load (1000+ messages)
- Profile JavaScript execution
- Measure iOS bundle size (<50MB target)
- Test offline mode end-to-end
- Verify haptic feedback on device

---

## Overview

Sprint 5 focuses on measuring, testing, and optimizing app performance. All major performance features are implemented; this sprint ensures they meet target metrics.

**Performance Targets**:
- Cold start: < 3 seconds (Time to Interactive)
- Trip page load: < 2 seconds
- Chat scroll: 60 FPS with 1000+ messages
- Bundle size: < 50MB (iOS IPA)
- Offline sync: < 5 seconds after reconnection

---

## 1. Cold Start Performance (<3 Seconds Target)

### Implementation Status

✅ **Lazy Loading** - All pages lazy loaded with retry mechanism
✅ **Code Splitting** - Manual chunks for vendor libraries
✅ **Service Worker** - Caches assets for offline access

**Files**:
- `src/App.tsx` (lines 28-84): Lazy route definitions with exponential backoff
- `vite.config.ts` (lines 46-54): Manual chunk configuration
- `public/sw.js`: Service worker for asset caching

### Measuring Cold Start Time

#### Method 1: Chrome DevTools Performance Tab

**Steps**:
1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Check "Screenshots"
4. Clear site data (Application → Clear storage → Clear site data)
5. Reload page with Performance recording active (Cmd+Shift+E)
6. Stop recording after page is interactive
7. Look for metrics:
   - **FCP** (First Contentful Paint): < 1.5s
   - **LCP** (Largest Contentful Paint): < 2.5s
   - **TTI** (Time to Interactive): < 3.0s

**Expected Results**:
- FCP: 0.8-1.2 seconds
- LCP: 1.5-2.0 seconds
- TTI: 2.0-2.8 seconds

**Screenshot Evidence**: Take screenshot showing metrics

#### Method 2: Lighthouse Audit

**Steps**:
1. Open Chrome DevTools → Lighthouse tab
2. Select "Performance" category
3. Select "Mobile" device
4. Select "Simulated throttling"
5. Click "Analyze page load"
6. Wait for report
7. Review metrics

**Target Scores**:
- Performance: > 90
- FCP: < 1.5s
- LCP: < 2.5s
- TBT (Total Blocking Time): < 300ms
- CLS (Cumulative Layout Shift): < 0.1

#### Method 3: Real User Monitoring (RUM)

**Steps**:
1. Add performance tracking to `performanceService.ts`
2. Log metrics to analytics
3. Track 95th percentile cold start time
4. Monitor across devices and networks

**Implementation**:
```typescript
// In src/services/performanceService.ts
export const trackColdStart = () => {
  const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const tti = navigationTiming.domInteractive - navigationTiming.fetchStart;

  console.log('[Performance] Cold start TTI:', tti, 'ms');

  // Send to analytics
  if (window.gtag) {
    gtag('event', 'timing_complete', {
      name: 'cold_start',
      value: Math.round(tti),
      event_category: 'Performance',
    });
  }
};
```

### Optimization Checklist

- [ ] All non-critical pages lazy loaded
- [ ] Critical CSS inlined in `index.html`
- [ ] Fonts preloaded with `<link rel="preload">`
- [ ] Largest Contentful Paint < 2.5s
- [ ] Total JavaScript < 500KB initial bundle
- [ ] Images lazy loaded with `loading="lazy"`
- [ ] Service worker caches critical assets

### Common Issues

**Issue**: Cold start > 3 seconds on mobile
- **Cause**: Network throttling, large JavaScript bundles
- **Fix**: Further code splitting, reduce third-party scripts

**Issue**: White flash before content loads
- **Cause**: No loading state, unstyled content flash
- **Fix**: Add skeleton loaders, inline critical CSS

**Issue**: Retry mechanism triggers on every load
- **Cause**: Aggressive chunking breaking cache
- **Fix**: Review `manualChunks` configuration

---

## 2. Trip Page Load Time (<2 Seconds Target)

### Implementation Status

✅ **Prefetching** - Critical trip data loaded in parallel
✅ **Lazy Tabs** - Non-active tabs loaded on demand
✅ **Cache-First** - Trip data cached in localStorage/IndexedDB

**Files**:
- `src/hooks/useTripChat.ts` (line 63-105): Cache-first loading
- `src/pages/TripDetail.tsx`: Parallel data fetching
- `src/services/chatStorage.ts`: IndexedDB caching

### Measuring Trip Page Load

#### Test Scenario: View Existing Trip

**Steps**:
1. Log in to app
2. Navigate to home (trip list)
3. Open DevTools Performance tab
4. Start recording
5. Click on a trip card
6. Stop recording when trip detail is fully loaded
7. Measure time from navigation to interactive

**Metrics to Track**:
- Navigation to route change: < 100ms
- Route change to first API request: < 200ms
- First API request to data rendered: < 1500ms
- **Total time**: < 2000ms

**Expected Breakdown**:
```
0-100ms:    Route navigation
100-300ms:  Component mount, useEffect triggered
300-1000ms: Parallel API requests (trip data, members, messages)
1000-1800ms: Data processing and rendering
1800-2000ms: Images loading (lazy), final interactions ready
```

#### Test Scenario: View Trip with Large Data

**Setup**:
- Trip with 1000+ messages
- Trip with 500+ photos
- Trip with 100+ members

**Steps**:
1. Navigate to large trip
2. Measure load time with DevTools
3. Verify virtualization kicks in
4. Check memory usage in Performance Monitor

**Expected Results**:
- Initial render: < 2 seconds (only first 15 messages)
- Smooth scrolling: 60 FPS
- Memory usage: < 200MB on desktop, < 150MB on mobile

#### Cache Performance Test

**Steps**:
1. Load trip for first time (cold cache)
2. Measure load time
3. Navigate away, then back (warm cache)
4. Measure load time again
5. Verify significant improvement

**Expected Results**:
- Cold cache: 1.8-2.0 seconds
- Warm cache: 0.5-0.8 seconds (70% faster)

### Optimization Checklist

- [ ] Trip metadata loads first (name, dates, cover image)
- [ ] Messages load in parallel with other data
- [ ] Non-critical data (tasks, polls) loads after initial render
- [ ] Images use blur-up loading with `srcset`
- [ ] Tabs use `enabled` prop for lazy loading
- [ ] Cache hit rate > 80% for returning users

### Common Issues

**Issue**: Trip page loads slow on first visit
- **Cause**: No cached data, waterfall requests
- **Fix**: Parallel data fetching, cache-first strategy

**Issue**: Trip page feels sluggish after loading
- **Cause**: Too many components rendering at once
- **Fix**: Use React.memo, useMemo, useCallback

**Issue**: Large trips freeze the UI
- **Cause**: Rendering 1000+ messages at once
- **Fix**: Verify virtualization is active

---

## 3. Virtualized Lists (60 FPS Target)

### Implementation Status

✅ **Chat Virtualization** - `VirtualizedMessageContainer.tsx`
✅ **Virtual Scroll Hook** - `useVirtualScroll.ts`
✅ **Windowing** - Shows last N messages initially, loads more on scroll

**Files**:
- `src/components/chat/VirtualizedMessageContainer.tsx` (221 lines)
- `src/hooks/useVirtualScroll.ts`
- `src/components/TripChat.tsx`: Uses VirtualizedMessageContainer

### Testing Virtualization

#### Test 1: Scroll Performance with 1000 Messages

**Setup**:
1. Create demo trip with 1000+ messages (use seed script if available)
2. Open trip chat
3. Open DevTools Performance tab

**Steps**:
1. Start recording
2. Scroll rapidly from bottom to top
3. Scroll back to bottom
4. Stop recording
5. Analyze FPS chart

**Expected Results**:
- FPS: Consistently above 55 (ideally 60)
- No long tasks (>50ms) during scroll
- Smooth visual experience

**Verification**:
```javascript
// Check FPS in console
let lastTime = performance.now();
let frames = 0;

function measureFPS() {
  frames++;
  const currentTime = performance.now();
  if (currentTime >= lastTime + 1000) {
    console.log('[FPS]', Math.round((frames * 1000) / (currentTime - lastTime)));
    frames = 0;
    lastTime = currentTime;
  }
  requestAnimationFrame(measureFPS);
}

measureFPS();
```

#### Test 2: Memory Usage Under Load

**Steps**:
1. Open DevTools Memory tab
2. Take heap snapshot (baseline)
3. Load chat with 1000 messages
4. Scroll through entire chat
5. Take second heap snapshot
6. Navigate away from chat
7. Take third heap snapshot
8. Compare memory usage

**Expected Results**:
- Memory increase from baseline: < 50MB
- Memory released after navigation: > 90%
- No memory leaks (third snapshot similar to baseline)

#### Test 3: Media Gallery Virtualization

**Note**: Media gallery uses `invalidateQueries` pattern, not full virtualization

**Steps**:
1. Open trip with 500+ photos
2. Navigate to Media tab
3. Scroll through gallery
4. Check FPS and memory

**Expected Results**:
- Initial render: < 1 second
- Scroll FPS: > 55
- Images lazy load as they enter viewport
- Memory usage: < 100MB

**Recommendation**: If media gallery lags, implement windowed grid similar to chat

### Virtualization Configuration

**Current Settings** (`VirtualizedMessageContainer.tsx`):
- Initial visible count: 10 messages
- Page size: 20 messages
- Load more threshold: 3 messages from top
- Auto-scroll: Enabled for new messages

**Tuning Parameters**:
- Increase `initialVisibleCount` for faster perceived load (trade-off: higher memory)
- Decrease `pageSize` for smoother load-more (trade-off: more frequent API calls)
- Adjust `loadMoreThreshold` for earlier/later pagination trigger

### Common Issues

**Issue**: Chat scroll is janky
- **Cause**: Variable message heights causing layout thrashing
- **Fix**: Pre-calculate heights or use fixed-height messages

**Issue**: "Load More" appears even with no more messages
- **Cause**: `hasMore` logic incorrect
- **Fix**: Verify API returns correct pagination metadata

**Issue**: New messages don't trigger scroll to bottom
- **Cause**: `autoScroll` disabled or `userIsScrolledUp` stuck
- **Fix**: Check scroll position detection logic

---

## 4. JavaScript Execution Optimization

### Implementation Status

✅ **Console Removal** - `drop_console: true` in production
✅ **Minification** - Terser with aggressive compression
✅ **Tree Shaking** - Unused code eliminated
✅ **Code Splitting** - Manual chunks for better caching

**Files**:
- `vite.config.ts` (lines 74-79): Terser configuration
- `vite.config.ts` (lines 46-54): Manual chunks

### Measuring JavaScript Performance

#### Test 1: Main Thread Blocking Time

**Steps**:
1. Open DevTools Performance tab
2. Enable "Screenshots" and "Memory"
3. Record while performing actions:
   - Send 10 messages
   - Upload 5 photos
   - Create calendar event
   - Open settings
4. Stop recording
5. Look for long tasks (red bars)

**Expected Results**:
- No long tasks (>50ms) during normal operations
- Total Blocking Time (TBT): < 300ms
- JavaScript execution: < 30% of main thread time

#### Test 2: Bundle Size Analysis

**Steps**:
1. Build production app:
   ```bash
   npm run build
   ```
2. Analyze bundle:
   ```bash
   npx vite-bundle-visualizer
   ```
3. Review largest chunks
4. Identify optimization opportunities

**Current Bundle Breakdown** (estimated):
```
Total size: ~450KB (gzipped)

Breakdown:
- react-vendor: ~140KB
- supabase: ~80KB
- ui-vendor: ~60KB
- utils: ~40KB
- app code: ~130KB
```

**Targets**:
- Initial bundle: < 500KB (gzipped)
- Total JavaScript: < 2MB (all chunks)
- Largest chunk: < 200KB

#### Test 3: Parse/Compile Time

**Steps**:
1. Open DevTools Performance tab
2. Record page load
3. Find "Parse and compile" sections
4. Sum up JavaScript parse time

**Expected Results**:
- Total parse time: < 500ms on mobile
- No single chunk taking >200ms to parse

### Optimization Checklist

- [ ] All console.log removed in production
- [ ] Debugger statements removed
- [ ] Source maps disabled in production (or external)
- [ ] Dead code eliminated
- [ ] Dependencies bundled efficiently
- [ ] No duplicate modules in bundle

### Common Issues

**Issue**: Bundle size grows over time
- **Cause**: New dependencies, large images in bundle
- **Fix**: Audit dependencies, use dynamic imports

**Issue**: App slow on low-end devices
- **Cause**: Too much JavaScript execution on main thread
- **Fix**: Move heavy computations to Web Workers

**Issue**: Long tasks block UI interactions
- **Cause**: Synchronous data processing, complex re-renders
- **Fix**: Debounce/throttle, batch updates, use React.memo

---

## 5. iOS Bundle Size Optimization (<50MB Target)

### Implementation Status

✅ **Xcode Configuration** - Release build with optimizations
✅ **Asset Catalog** - Images managed in Assets.xcassets
✅ **Code Signing** - Configured for App Store distribution

**Files**:
- `ios/App/App.xcodeproj/project.pbxproj`: Build settings
- `ios/App/App/Assets.xcassets/`: Image assets
- `capacitor.config.ts`: Capacitor configuration

### Measuring iOS Bundle Size

#### Method 1: Xcode Archive

**Steps**:
1. Open Xcode project: `ios/App/App.xcworkspace`
2. Select "Any iOS Device" as target
3. Product → Archive
4. Wait for archive to complete
5. Organizer window opens
6. Right-click archive → Show in Finder
7. Right-click `.xcarchive` → Show Package Contents
8. Navigate to `Products/Applications/`
9. Right-click `App.app` → Get Info
10. Check file size

**Expected Results**:
- App.app size: < 30MB (before IPA packaging)
- IPA size: < 50MB (App Store distribution)
- Thinned size (device-specific): < 25MB

#### Method 2: App Store Connect

**Steps**:
1. Upload build to TestFlight
2. Wait for processing (10-15 minutes)
3. Go to App Store Connect → TestFlight
4. Select build
5. View "App Store File Sizes"
6. Check universal and device-specific sizes

**Expected Results**:
- Universal IPA: < 50MB
- iPhone 12 Pro: < 28MB
- iPhone SE: < 25MB
- iPad Pro: < 30MB

### Optimization Techniques

#### 1. Asset Optimization

**Audit Current Assets**:
```bash
cd ios/App/App/Assets.xcassets
find . -name "*.png" -exec du -h {} \; | sort -rh | head -20
```

**Optimization Steps**:
- Remove unused images
- Use vector images (.svg → .pdf) where possible
- Compress PNG images with ImageOptim or TinyPNG
- Use appropriate resolutions (@1x, @2x, @3x only where needed)

**Example**:
```bash
# Convert large PNG to smaller format
pngquant --quality=65-80 AppIcon-1024.png --output AppIcon-1024-opt.png
```

#### 2. Bitcode and App Thinning

**Enable in Xcode**:
1. Select project in Xcode
2. Build Settings → Enable Bitcode: Yes
3. Build Settings → Strip Debug Symbols: Yes (Release only)
4. Build Settings → Strip Linked Product: Yes (Release only)

**Verify**:
- Build for Release configuration
- Check IPA size reduction (5-15% typical)

#### 3. Remove Unused Resources

**Audit Unused Files**:
```bash
# Find potentially unused image assets
cd ios/App/App
grep -r "UIImage(named:" . | cut -d'"' -f2 | sort | uniq > used_images.txt
find Assets.xcassets -name "*.imageset" | sed 's/.imageset//' | sort > all_images.txt
comm -13 used_images.txt all_images.txt
```

#### 4. On-Demand Resources

**For Large Assets** (not critical for initial launch):
- Mark large images as on-demand resources
- Download when needed
- Reduces initial download size

**Configuration**: Xcode → File Inspector → On Demand Resource Tags

### Bundle Size Breakdown

**Typical Chravel iOS Bundle**:
```
Total: 45-50MB

Breakdown:
- Web assets (dist/): 12-15MB
- Native code (App binary): 8-10MB
- Image assets: 10-12MB
- Third-party frameworks: 8-10MB
  - Capacitor runtime: 3-4MB
  - RevenueCat SDK: 2-3MB
  - Other dependencies: 3-4MB
- System libraries: 5-8MB
```

### Optimization Checklist

- [ ] Release build configuration used
- [ ] Bitcode enabled
- [ ] Debug symbols stripped
- [ ] Unused assets removed
- [ ] Images optimized (ImageOptim/TinyPNG)
- [ ] App thinning enabled
- [ ] IPA size < 50MB

### Common Issues

**Issue**: IPA size > 50MB
- **Cause**: Large images, unoptimized assets, bundled fonts
- **Fix**: Compress images, remove unused assets, use system fonts

**Issue**: Build succeeds but IPA upload fails (size limit)
- **Cause**: Exceeded 150MB uncompressed limit
- **Fix**: Enable bitcode, use on-demand resources for large media

**Issue**: Device-specific build still large
- **Cause**: App thinning not working
- **Fix**: Verify asset catalogs configured correctly, use appropriate image sets

---

## 6. Offline Mode Testing

### Implementation Status

✅ **Offline Queue** - `offlineMessageQueue.ts`, `taskOfflineQueue.ts`, `calendarOfflineQueue.ts`
✅ **Offline Sync** - `offlineSyncService.ts` with global processor
✅ **Offline Indicator** - `OfflineIndicator.tsx` shows connection status
✅ **Cache Storage** - `chatStorage.ts` caches messages in IndexedDB

**Files**:
- `src/services/offlineMessageQueue.ts`: Message queue
- `src/services/offlineSyncService.ts`: Unified sync service
- `src/services/globalSyncProcessor.ts`: Background sync processor
- `src/hooks/useOfflineStatus.ts`: Connection detection

### Testing Offline Mode

#### Test 1: Send Messages Offline

**Steps**:
1. Log in and open a trip chat
2. Toggle DevTools Network → Offline
3. Send 5 chat messages
4. Observe messages queued (shown with pending indicator)
5. Toggle Network → Online
6. Wait for sync
7. Verify messages sent successfully

**Expected Results**:
- Messages appear immediately with pending indicator
- After reconnection, messages sync within 5 seconds
- All messages have correct timestamps
- No duplicates

#### Test 2: Create Tasks Offline

**Steps**:
1. Open trip Tasks tab
2. Go offline (Network → Offline)
3. Create 3 new tasks
4. Mark 1 task as complete
5. Go online
6. Wait for sync
7. Verify all changes persisted

**Expected Results**:
- Tasks created offline saved locally
- After sync, tasks appear on server
- Task completion status synced correctly
- No data loss

#### Test 3: Calendar Events Offline

**Steps**:
1. Open trip Calendar tab
2. Go offline
3. Create 2 calendar events
4. Edit 1 existing event
5. Go online
6. Wait for sync

**Expected Results**:
- Events created offline queued
- Edits preserved
- After sync, calendar matches across devices
- No conflicts or duplicates

#### Test 4: Media Upload Offline

**Steps**:
1. Open trip Media tab
2. Go offline
3. Attempt to upload photo
4. Observe behavior

**Expected Results**:
- Photo upload queued or shows error
- After reconnection, upload retries automatically
- Or: Clear message that upload requires connection

**Note**: Media uploads may require immediate connection due to size

#### Test 5: Long Offline Period

**Steps**:
1. Perform various actions while offline:
   - Send 20 messages
   - Create 5 tasks
   - Create 3 calendar events
2. Keep app offline for 10 minutes
3. Bring app back online
4. Wait for sync
5. Verify all actions synced

**Expected Results**:
- Offline queue persists across app restarts
- All queued actions sync successfully
- Sync completes within 30 seconds for 20+ items
- No errors or data loss

### Offline Mode Configuration

**Current Settings** (`offlineSyncService.ts`):
- Retry attempts: 3
- Retry delay: 2 seconds (exponential backoff)
- Max queue size: 1000 items
- Batch sync: Up to 10 items at once

**Tuning Parameters**:
- Increase retry attempts for unreliable networks
- Decrease batch size if sync times out
- Add priority levels for different operation types

### Offline Mode Checklist

- [ ] Offline indicator visible when offline
- [ ] Messages queue correctly
- [ ] Tasks queue correctly
- [ ] Calendar events queue correctly
- [ ] Queue persists across app restarts
- [ ] Sync occurs within 5 seconds of reconnection
- [ ] No data loss during offline period
- [ ] Conflicts handled gracefully

### Common Issues

**Issue**: Offline actions not syncing after reconnection
- **Cause**: Sync processor not running, queue corrupt
- **Fix**: Check `globalSyncProcessor.ts` initialization, clear corrupt queue

**Issue**: Duplicate items after sync
- **Cause**: Optimistic update not cleared, duplicate INSERT events
- **Fix**: Verify client_message_id used for deduplication

**Issue**: Long sync time (>30 seconds)
- **Cause**: Large queue, slow network, blocking operations
- **Fix**: Batch operations, parallel sync, progress indicator

---

## 7. Haptic Feedback Testing

### Implementation Status

✅ **Haptic Service** - `hapticService.ts` with 8 feedback types
✅ **Native Integration** - `native/haptics.ts` using Capacitor Haptics plugin
✅ **Usage Across App** - Key interactions trigger haptics

**Files**:
- `src/services/hapticService.ts`: Service wrapper
- `src/native/haptics.ts`: Native Capacitor integration
- Usage in: buttons, swipes, success actions, errors

### Testing Haptic Feedback

#### Test 1: Verify All Haptic Types

**Requires**: Physical iOS device (haptics don't work in simulator)

**Steps**:
1. Install app on iPhone via TestFlight
2. Test each haptic type:
   - **Light**: Tap on list items
   - **Medium**: Button press
   - **Heavy**: Important action (e.g., delete)
   - **Success**: Message sent successfully
   - **Warning**: Form validation warning
   - **Error**: Error toast shown
   - **Selection**: Tab change, picker scroll
   - **Vibrate**: Custom duration vibration

**Expected Results**:
- Each haptic feels distinct
- Haptics match iOS Human Interface Guidelines
- No excessive or annoying feedback
- Haptics respect system settings (can be disabled)

**Manual Test Locations**:
- Send chat message → Success haptic
- Tap tab in bottom navigation → Selection haptic
- Delete trip → Warning then Success haptics
- Network error → Error haptic
- Pull to refresh → Light haptic at start, Success when done

#### Test 2: Haptic Consistency

**Steps**:
1. Perform same action 10 times
2. Verify haptic triggers every time
3. Verify haptic feels consistent

**Expected Results**:
- 100% reliability (haptic always fires)
- Consistent timing (no delay)
- Consistent intensity

#### Test 3: System Settings Respect

**Steps**:
1. Open iOS Settings → Sounds & Haptics
2. Disable "System Haptics"
3. Return to app
4. Perform actions that trigger haptics
5. Verify no haptic feedback

**Expected Results**:
- App respects system settings
- No haptics when disabled globally
- No errors or crashes

#### Test 4: Performance Impact

**Steps**:
1. Open DevTools Performance Monitor
2. Trigger 50 haptics rapidly (e.g., scroll picker fast)
3. Monitor CPU and memory usage

**Expected Results**:
- Minimal CPU impact (<5% increase)
- No memory leaks
- Smooth UI despite haptics

### Haptic Usage Patterns

**Current Implementation**:
```typescript
// Success action
await hapticService.success();

// Error action
await hapticService.error();

// Selection changed (tab, picker)
await hapticService.selectionChanged();

// Button tap
await hapticService.medium();
```

**Best Practices**:
- Use sparingly (don't haptic every action)
- Match haptic to action importance
- Avoid rapid-fire haptics (<100ms apart)
- Provide visual feedback alongside haptic
- Test on actual device (not simulator)

### Haptic Feedback Checklist

- [ ] Haptics implemented for key interactions
- [ ] All 8 haptic types tested on device
- [ ] Haptics feel appropriate for each action
- [ ] System settings respected
- [ ] No performance impact
- [ ] Haptics don't fire excessively
- [ ] Native iOS patterns followed

### Common Issues

**Issue**: Haptics don't work on device
- **Cause**: System haptics disabled, device in silent mode
- **Fix**: Check device settings, test on different device

**Issue**: Haptics lag or delay
- **Cause**: Haptic called after async operation
- **Fix**: Call haptic synchronously with user action

**Issue**: Excessive haptics annoy users
- **Cause**: Too many haptic triggers
- **Fix**: Remove haptics from frequent actions (scroll, typing)

---

## 8. Final Pre-Submission Performance Checklist

Before proceeding to Sprint 6, verify all performance targets met:

### Cold Start Performance
- [ ] FCP < 1.5 seconds (measured with Lighthouse)
- [ ] LCP < 2.5 seconds
- [ ] TTI < 3.0 seconds
- [ ] Lighthouse Performance score > 90
- [ ] Bundle size < 500KB (initial, gzipped)

### Trip Page Load
- [ ] Initial load < 2 seconds (cold cache)
- [ ] Warm cache load < 0.8 seconds
- [ ] Parallel data fetching verified
- [ ] Cache hit rate > 80%
- [ ] No layout shift during load (CLS < 0.1)

### Virtualization
- [ ] Chat scrolls at 60 FPS with 1000+ messages
- [ ] Memory usage < 50MB increase for large chats
- [ ] No memory leaks after navigation
- [ ] Load more pagination works smoothly

### JavaScript Execution
- [ ] No long tasks (>50ms) during interactions
- [ ] Total Blocking Time < 300ms
- [ ] Console.log removed in production
- [ ] Bundle analysis shows no duplicate modules
- [ ] Parse time < 500ms on mobile

### iOS Bundle Size
- [ ] IPA size < 50MB (App Store distribution)
- [ ] Thinned size < 28MB (iPhone-specific)
- [ ] Bitcode enabled
- [ ] Debug symbols stripped
- [ ] Unused assets removed

### Offline Mode
- [ ] Messages queue offline
- [ ] Tasks queue offline
- [ ] Calendar events queue offline
- [ ] Sync within 5 seconds of reconnection
- [ ] No data loss during offline period
- [ ] Queue persists across app restarts

### Haptic Feedback
- [ ] All 8 haptic types working
- [ ] Haptics tested on physical device
- [ ] System settings respected
- [ ] No excessive feedback
- [ ] Performance impact minimal

### General Performance
- [ ] No console errors during normal use
- [ ] Memory usage stable (<200MB on desktop)
- [ ] No memory leaks (profiled with DevTools)
- [ ] Smooth animations (60 FPS)
- [ ] App responsive under slow 3G

---

## 9. Performance Monitoring Setup

### Recommended Metrics to Track

**Client-Side RUM (Real User Monitoring)**:
```typescript
// Track key metrics in production
export const trackPerformanceMetrics = () => {
  // Core Web Vitals
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        console.log('[Perf] FCP:', entry.startTime);
        // Send to analytics
      }
    }
  }).observe({ type: 'paint', buffered: true });

  // LCP
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('[Perf] LCP:', lastEntry.startTime);
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  // CLS
  let clsValue = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }
    console.log('[Perf] CLS:', clsValue);
  }).observe({ type: 'layout-shift', buffered: true });
};
```

**Analytics Events to Track**:
- Cold start time (TTI)
- Trip page load time
- Offline sync duration
- Bundle load errors
- JavaScript errors
- Memory warnings

**Alerts to Set Up**:
- Cold start > 5 seconds (P95)
- Trip load > 4 seconds (P95)
- Offline sync failures > 5%
- JavaScript errors > 0.1% of page views

### Tools and Services

**Recommended**:
- **Lighthouse CI**: Automated performance testing in CI/CD
- **Sentry Performance**: RUM and error tracking
- **DataDog RUM**: Detailed performance analytics
- **Google Analytics**: Core Web Vitals tracking
- **LogRocket**: Session replay with performance data

---

## 10. Performance Optimization Backlog

### High Priority (Do Before Launch)

1. **Measure all metrics** against targets
   - Run Lighthouse audits on key pages
   - Test on slow networks (Slow 3G)
   - Test on low-end devices (iPhone 8)

2. **Fix critical performance issues**
   - Any metric failing target by >20%
   - Any long tasks >100ms
   - Any memory leaks

3. **Set up basic monitoring**
   - Track Core Web Vitals
   - Monitor error rates
   - Alert on performance regressions

### Medium Priority (Post-Launch Optimization)

4. **Optimize images**
   - Convert to WebP with fallback
   - Implement responsive images
   - Lazy load below-fold images

5. **Implement media gallery virtualization**
   - Windowed grid for 500+ photos
   - Thumbnail caching
   - Progressive image loading

6. **Add Web Workers**
   - Move heavy computations off main thread
   - Background sync processing
   - Image resizing/compression

### Low Priority (Future Enhancements)

7. **Advanced caching strategies**
   - Service worker with workbox
   - Network-first, cache fallback
   - Background sync API

8. **Predictive prefetching**
   - Prefetch likely next pages
   - Preload trip data on hover
   - Smart cache warming

9. **Performance budget**
   - Enforce bundle size limits in CI
   - Automated performance testing
   - Regression detection

---

## Next Steps

Once all performance testing is complete and targets met:
1. Document any performance issues found
2. Fix critical issues blocking App Store submission
3. Set up production monitoring
4. Proceed to **Sprint 6: App Store Submission Assets**

---

## Support Resources

- **Chrome DevTools Performance**: https://developer.chrome.com/docs/devtools/performance/
- **Lighthouse**: https://developer.chrome.com/docs/lighthouse/overview/
- **Core Web Vitals**: https://web.dev/vitals/
- **React Performance**: https://react.dev/learn/render-and-commit#optimizing-performance
- **Vite Performance**: https://vitejs.dev/guide/performance.html
- **iOS App Thinning**: https://developer.apple.com/documentation/xcode/reducing-your-app-s-size

## Questions or Issues?

If you encounter performance issues:
1. Profile with Chrome DevTools
2. Check bundle size with vite-bundle-visualizer
3. Test on real devices (not just simulator/emulator)
4. Measure before and after optimizations
5. Consult docs/APP_STORE_PLAN.md for context
