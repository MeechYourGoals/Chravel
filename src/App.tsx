import React, { lazy, useCallback, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { pageView } from '@/telemetry/events';
import { ConsumerSubscriptionProvider } from './hooks/useConsumerSubscription';
import { MobileAppLayout } from './components/mobile/MobileAppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LazyRoute } from './components/LazyRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { performanceService } from './services/performanceService';
import { useDemoModeStore } from './store/demoModeStore';
import { errorTracking } from './services/errorTracking';
import { supabase } from './integrations/supabase/client';
import { AppInitializer } from './components/app/AppInitializer';
import { OfflineIndicator } from './components/OfflineIndicator';

import { ExitDemoButton } from './components/demo';
import { attachNavigator, onNativeResume, setNativeBadgeCount } from '@/native/lifecycle';
import { useDeepLinks } from '@/hooks/useDeepLinks';

import { setupGlobalSyncProcessor } from './services/globalSyncProcessor';
import { useSwUpdate } from '@/hooks/useSwUpdate';
import { safeReload } from '@/utils/safeReload';
import { retryImport } from '@/lib/retryImport';
import Index from './pages/Index';

// Lazy load pages for better performance

const TripDetail = lazy(() => retryImport(() => import('./pages/TripDetail')));
const DemoTripGate = lazy(() => retryImport(() => import('./pages/DemoTripGate')));

const ProTripDetail = lazy(() => retryImport(() => import('./pages/ProTripDetail')));
const EventDetail = lazy(() => retryImport(() => import('./pages/EventDetail')));
const NotFound = lazy(() => retryImport(() => import('./pages/NotFound')));
const JoinTrip = lazy(() => retryImport(() => import('./pages/JoinTrip')));
const ProfilePage = lazy(() => retryImport(() => import('./pages/ProfilePage')));
const SettingsPage = lazy(() => retryImport(() => import('./pages/SettingsPage')));
const ArchivePage = lazy(() => retryImport(() => import('./pages/ArchivePage')));
const AdminDashboard = lazy(() =>
  retryImport(() =>
    import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })),
  ),
);
const OrganizationDashboard = lazy(() =>
  retryImport(() =>
    import('./pages/OrganizationDashboard').then(module => ({
      default: module.OrganizationDashboard,
    })),
  ),
);
const OrganizationsHub = lazy(() =>
  retryImport(() =>
    import('./pages/OrganizationsHub').then(module => ({ default: module.OrganizationsHub })),
  ),
);
const AcceptOrganizationInvite = lazy(() =>
  retryImport(() =>
    import('./pages/AcceptOrganizationInvite').then(module => ({
      default: module.AcceptOrganizationInvite,
    })),
  ),
);
const ChravelRecsPage = lazy(() =>
  retryImport(() =>
    import('./pages/ChravelRecsPage').then(module => ({ default: module.ChravelRecsPage })),
  ),
);
const ForTeams = lazy(() =>
  retryImport(() => import('./pages/ForTeams').then(module => ({ default: module.ForTeams }))),
);
const AdvertiserDashboard = lazy(() => retryImport(() => import('./pages/AdvertiserDashboard')));
const Healthz = lazy(() => retryImport(() => import('./pages/Healthz')));
const PrivacyPolicy = lazy(() => retryImport(() => import('./pages/PrivacyPolicy')));
const SupportPage = lazy(() => retryImport(() => import('./pages/SupportPage')));
const TermsOfService = lazy(() => retryImport(() => import('./pages/TermsOfService')));
import { GmailCallbackPage } from './pages/GmailCallbackPage';
const DemoEntry = lazy(() => retryImport(() => import('./pages/DemoEntry')));
const TripPreview = lazy(() => retryImport(() => import('./pages/TripPreview')));
const AuthPage = lazy(() => retryImport(() => import('./pages/AuthPage')));
const ResetPasswordPage = lazy(() => retryImport(() => import('./pages/ResetPasswordPage')));
const DeviceTestMatrix = lazy(() => retryImport(() => import('./pages/DeviceTestMatrix')));
// AdminMigrateDemoImages removed - migration complete, images now in Supabase Storage

// Note: Large components are already optimized with code splitting

// Legacy redirect for old pro trip URLs using hyphen format
const LegacyProTripRedirect = () => {
  const { proTripId } = useParams();
  return <Navigate to={`/tour/pro/${proTripId}`} replace />;
};

// Always use BrowserRouter - Lovable preview now supports SPA routing
const Router = BrowserRouter;

// Adapter component: renders ExitDemoButton inside Router context with navigation callback
const ExitDemoButtonWithNav = () => {
  const navigate = useNavigate();
  return <ExitDemoButton onNavigate={() => navigate('/')} />;
};

const NativeLifecycleBridge = ({ client }: { client: QueryClient }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Handle deep links (Universal Links + Custom URL Scheme)
  useDeepLinks();

  // Allow native lifecycle module to route notification taps (including cold start).
  useEffect(() => {
    return attachNavigator(navigate);
  }, [navigate]);

  const refreshCriticalData = useCallback(async (): Promise<void> => {
    if (!user) return;
    // Refetch active queries when returning to foreground.
    await client.invalidateQueries({ refetchType: 'active' });
  }, [client, user]);

  const syncBadgeCount = useCallback(async (): Promise<void> => {
    if (!user) {
      await setNativeBadgeCount(0);
      return;
    }

    // Minimal badge source-of-truth: unread rows in `notifications` table.
    // (If you later add a dedicated unread-messages aggregate, swap it in here.)
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('[Lifecycle] Failed to fetch unread notifications count:', error);
      return;
    }

    await setNativeBadgeCount(count ?? 0);
  }, [user]);

  // Run once on mount (helps cold start).
  useEffect(() => {
    void syncBadgeCount();
  }, [syncBadgeCount]);

  // On resume: refresh + badge sync.
  useEffect(() => {
    const unsubRefresh = onNativeResume(refreshCriticalData);
    const unsubBadge = onNativeResume(syncBadgeCount);
    return () => {
      unsubRefresh();
      unsubBadge();
    };
  }, [refreshCriticalData, syncBadgeCount]);

  return null;
};

/** Tracks page views on route changes via the telemetry service. */
const PageViewTracker = () => {
  const { pathname } = useLocation();
  const prevPathRef = React.useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      pageView(pathname);
    }
  }, [pathname]);

  // Also fire on initial mount
  useEffect(() => {
    pageView(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

const OfflineIndicatorGate = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/join') ||
    pathname.startsWith('/accept-invite') ||
    pathname.startsWith('/teams') ||
    pathname.startsWith('/recs') ||
    pathname.startsWith('/advertiser') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/support') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/healthz');

  if (!user || isPublicRoute) return null;
  return <OfflineIndicator />;
};

const App = () => {
  // ⚡ PERFORMANCE: Initialize demo mode synchronously on first render (not at module load)
  // Moving this inside the component prevents "dispatcher.useState" errors on some platforms
  React.useMemo(() => {
    useDemoModeStore.getState().init();
  }, []);
  // Track app initialization performance
  const stopTiming = performanceService.startTiming('App Initialization');

  React.useEffect(() => {
    stopTiming();
  }, [stopTiming]);

  // Initialize error tracking with user context
  useEffect(() => {
    errorTracking.init({ environment: import.meta.env.MODE });

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        errorTracking.setUser(data.user.id);
      }
    });
  }, []);

  // Show toast when a new service worker is installed and waiting to activate
  useSwUpdate();

  // Setup global offline sync processor
  useEffect(() => {
    return setupGlobalSyncProcessor();
  }, []);

  // Breaking-only version check - only triggers for true breaking changes (manually incremented)
  useEffect(() => {
    try {
      const BREAKING_VERSION_KEY = 'chravel_breaking_version';
      const CURRENT_BREAKING_VERSION = '1'; // Only increment for true breaking changes (auth, API, schema)

      const storedBreaking = localStorage.getItem(BREAKING_VERSION_KEY);

      // First visit - store and continue
      if (!storedBreaking) {
        localStorage.setItem(BREAKING_VERSION_KEY, CURRENT_BREAKING_VERSION);
        return;
      }

      // Breaking change detected - force reload silently
      if (storedBreaking !== CURRENT_BREAKING_VERSION) {
        if ('caches' in window) {
          caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))));
        }
        localStorage.setItem(BREAKING_VERSION_KEY, CURRENT_BREAKING_VERSION);
        safeReload(true);
      }
    } catch {
      // Ignore in restricted environments (sandboxed previews)
    }
  }, []);

  // Silent update check on visibility change (native app-style updates)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
        // Silently check for SW updates when app becomes visible
        navigator.serviceWorker.ready.then(registration => {
          registration.update().catch(() => {
            // Silently ignore update check failures
          });
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Chunk load failure recovery with better error detection
  useEffect(() => {
    let toastShown = false;

    const clearCachesAndReload = async () => {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }
      await safeReload();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason?.message || String(event.reason);
      const errorString = String(event.reason);

      const isChunkError =
        error.includes('Loading chunk') ||
        error.includes('Failed to fetch dynamically imported') ||
        error.includes('Failed to fetch') ||
        error.includes('Failed to load module script') ||
        errorString.includes('Failed to fetch dynamically imported') ||
        errorString.includes('Loading chunk');

      if (isChunkError && !toastShown) {
        console.error('[App] Chunk loading error detected, auto-recovering:', error);
        toastShown = true;
        clearCachesAndReload();
      }
    };

    // Also handle error events
    const handleError = (event: ErrorEvent) => {
      const error = event.message || String(event.error);
      if (
        (error.includes('Failed to fetch dynamically imported') ||
          error.includes('Loading chunk') ||
          error.includes('Failed to load module script')) &&
        !toastShown
      ) {
        handleUnhandledRejection({
          reason: { message: error },
          preventDefault: () => {},
        } as PromiseRejectionEvent);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <ErrorBoundary>
      {/* Global SVG gradient definition for metallic gold icons */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="gold-metallic-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#533517" />
            <stop offset="40%" stopColor="#c49746" />
            <stop offset="70%" stopColor="#feeaa5" />
            <stop offset="100%" stopColor="#c49746" />
          </linearGradient>
        </defs>
      </svg>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ConsumerSubscriptionProvider>
            <AppInitializer>
              <TooltipProvider>
                <Toaster />
                <Sonner />

                {/* All components using react-router hooks must render inside <Router> */}
                <Router>
                  <PageViewTracker />
                  <ExitDemoButtonWithNav />
                  <NativeLifecycleBridge client={queryClient} />
                  <OfflineIndicatorGate />
                  <MobileAppLayout>
                    <Routes>
                      <Route
                        path="/"
                        element={
                          <LazyRoute>
                            <Index />
                          </LazyRoute>
                        }
                      />
                      <Route path="/api/gmail/oauth/callback" element={<GmailCallbackPage />} />
                      <Route
                        path="/trip/:tripId"
                        element={
                          <LazyRoute>
                            <TripDetail />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/trip/:tripId/preview"
                        element={
                          <LazyRoute>
                            <TripPreview />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/demo/trip/:demoTripId"
                        element={
                          <LazyRoute>
                            <DemoTripGate />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/demo"
                        element={
                          <LazyRoute>
                            <DemoEntry />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/auth"
                        element={
                          <LazyRoute>
                            <AuthPage />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/reset-password"
                        element={
                          <LazyRoute>
                            <ResetPasswordPage />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/join/:token"
                        element={
                          <LazyRoute>
                            <JoinTrip />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/tour/pro/:proTripId"
                        element={
                          <LazyRoute>
                            <ProTripDetail />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/tour/pro-:proTripId"
                        element={
                          <LazyRoute>
                            <LegacyProTripRedirect />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/event/:eventId"
                        element={
                          <LazyRoute>
                            <EventDetail />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/teams"
                        element={
                          <LazyRoute>
                            <ForTeams />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/recs"
                        element={
                          <LazyRoute>
                            <ChravelRecsPage />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/advertiser"
                        element={
                          <LazyRoute>
                            <AdvertiserDashboard />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/healthz"
                        element={
                          <LazyRoute>
                            <Healthz />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/privacy"
                        element={
                          <LazyRoute>
                            <PrivacyPolicy />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/support"
                        element={
                          <LazyRoute>
                            <SupportPage />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/terms"
                        element={
                          <LazyRoute>
                            <TermsOfService />
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <LazyRoute>
                            <ProtectedRoute>
                              <ProfilePage />
                            </ProtectedRoute>
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/settings"
                        element={
                          <LazyRoute>
                            <ProtectedRoute>
                              <SettingsPage />
                            </ProtectedRoute>
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/archive"
                        element={
                          <LazyRoute>
                            <ProtectedRoute>
                              <ArchivePage />
                            </ProtectedRoute>
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/admin/scheduled-messages"
                        element={
                          <LazyRoute>
                            <ProtectedRoute>
                              <AdminDashboard />
                            </ProtectedRoute>
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/organizations"
                        element={
                          <LazyRoute>
                            <ProtectedRoute>
                              <OrganizationsHub />
                            </ProtectedRoute>
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/organization/:orgId"
                        element={
                          <LazyRoute>
                            <ProtectedRoute>
                              <OrganizationDashboard />
                            </ProtectedRoute>
                          </LazyRoute>
                        }
                      />
                      <Route
                        path="/accept-invite/:token"
                        element={
                          <LazyRoute>
                            <AcceptOrganizationInvite />
                          </LazyRoute>
                        }
                      />
                      {import.meta.env.DEV && (
                        <Route
                          path="/dev/device-matrix"
                          element={
                            <LazyRoute>
                              <DeviceTestMatrix />
                            </LazyRoute>
                          }
                        />
                      )}
                      <Route
                        path="*"
                        element={
                          <LazyRoute>
                            <NotFound />
                          </LazyRoute>
                        }
                      />
                    </Routes>
                  </MobileAppLayout>
                </Router>
              </TooltipProvider>
            </AppInitializer>
          </ConsumerSubscriptionProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
