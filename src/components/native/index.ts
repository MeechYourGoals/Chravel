/**
 * Native iOS-style UI Components
 *
 * A collection of components designed to make the app feel native on iOS.
 * These components follow Apple's Human Interface Guidelines.
 */

// Bottom Sheet
export { NativeBottomSheet } from './NativeBottomSheet';

// Tab Bar (iOS-style bottom navigation)
export { NativeTabBar, NativeTabBarSpacer } from './NativeTabBar';
export type { TabId, CoreTabId } from './NativeTabBar';

// Trip Type Switcher (like Instagram's account switcher)
export {
  NativeTripTypeSwitcher,
  TripTypeIndicator,
  getTripTypeLabel,
  getTripTypeShortLabel,
} from './NativeTripTypeSwitcher';

// Lists (iOS-style grouped lists)
export { NativeList, NativeListSection, NativeListItem, NativeToggleItem } from './NativeList';

// Segmented Controls
export { NativeSegmentedControl, NativePillSegment } from './NativeSegmentedControl';

// Navigation
export { NativeLargeTitle, NativeCompactHeader } from './NativeLargeTitle';

// Page Transitions
export {
  NativePageTransition,
  NativeNavigationStack,
  NativeTabTransition,
  useNavigationStack,
} from './NativePageTransition';

// Empty & Loading States
export { NativeEmptyState, NativeLoadingState, NativePullIndicator } from './NativeEmptyState';

// Subscription Paywall
export { NativeSubscriptionPaywall } from './NativeSubscriptionPaywall';

// Settings
export { NativeSettings } from './NativeSettings';
