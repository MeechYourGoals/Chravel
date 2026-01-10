
import React, { lazy, useCallback, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ConsumerSubscriptionProvider } from "./hooks/useConsumerSubscription";
import { MobileAppLayout } from "./components/mobile/MobileAppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LazyRoute } from "./components/LazyRoute";
import { performanceService } from "./services/performanceService";
import { useDemoModeStore } from "./store/demoModeStore";
import { errorTracking } from "./services/errorTracking";
import { supabase } from "./integrations/supabase/client";
import { AppInitializer } from "./components/app/AppInitializer";
import BuildBadge from "./components/BuildBadge";
import { OfflineIndicator } from "./components/OfflineIndicator";

import { ExitDemoButton } from "./components/demo";
import { attachNavigator, onNativeResume, setNativeBadgeCount } from "@/native/lifecycle";
import { useDeepLinks } from "@/hooks/useDeepLinks";

import { toast } from "@/hooks/use-toast";
import { setupGlobalSyncProcessor } from "./services/globalSyncProcessor";

// Lazy load pages for better performance
// Enhanced retry mechanism with exponential backoff and better error handling
const retryImport = <T,>(importFn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  return new Promise((resolve, reject) => {
    importFn()
      .then(resolve)
      .catch((error) => {
        const errorMessage = error?.message || String(error);
        const isChunkError = 
          errorMessage.includes('Failed to fetch dynamically imported module') ||
          errorMessage.includes('Loading chunk') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError');
        
        // Only retry on chunk loading errors
        if (!isChunkError || retries === 0) {
          console.error('Import failed after retries:', error);
          reject(error);
          return;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const nextDelay = delay * Math.pow(2, 3 - retries);
        console.warn(`Retrying import (${retries} retries left) after ${nextDelay}ms...`);
        
        setTimeout(() => {
          retryImport(importFn, retries - 1, delay).then(resolve, reject);
        }, nextDelay);
      });
  });
};

const Index = lazy(() => retryImport(() => import("./pages/Index")));
const TripDetail = lazy(() => retryImport(() => import("./pages/TripDetail")));
const DemoTripGate = lazy(() => retryImport(() => import("./pages/DemoTripGate")));

const ProTripDetail = lazy(() => retryImport(() => import("./pages/ProTripDetail")));
const EventDetail = lazy(() => retryImport(() => import("./pages/EventDetail")));
const NotFound = lazy(() => retryImport(() => import("./pages/NotFound")));
const JoinTrip = lazy(() => retryImport(() => import("./pages/JoinTrip")));
const ProfilePage = lazy(() => retryImport(() => import("./pages/ProfilePage")));
const SettingsPage = lazy(() => retryImport(() => import("./pages/SettingsPage")));
const ArchivePage = lazy(() => retryImport(() => import("./pages/ArchivePage")));
const AdminDashboard = lazy(() => retryImport(() => import("./pages/AdminDashboard").then(module => ({ default: module.AdminDashboard }))));
const OrganizationDashboard = lazy(() => retryImport(() => import("./pages/OrganizationDashboard").then(module => ({ default: module.OrganizationDashboard }))));
const OrganizationsHub = lazy(() => retryImport(() => import("./pages/OrganizationsHub").then(module => ({ default: module.OrganizationsHub }))));
const AcceptOrganizationInvite = lazy(() => retryImport(() => import("./pages/AcceptOrganizationInvite").then(module => ({ default: module.AcceptOrganizationInvite }))));
const ChravelRecsPage = lazy(() => retryImport(() => import("./pages/ChravelRecsPage").then(module => ({ default: module.ChravelRecsPage }))));
const ForTeams = lazy(() => retryImport(() => import("./pages/ForTeams").then(module => ({ default: module.ForTeams }))));
const AdvertiserDashboard = lazy(() => retryImport(() => import("./pages/AdvertiserDashboard")));
const Healthz = lazy(() => retryImport(() => import("./pages/Healthz")));
const PrivacyPolicy = lazy(() => retryImport(() => import("./pages/PrivacyPolicy")));
const TermsOfService = lazy(() => retryImport(() => import("./pages/TermsOfService")));
const DemoEntry = lazy(() => retryImport(() => import("./pages/DemoEntry")));
const TripPreview = lazy(() => retryImport(() => import("./pages/TripPreview")));
const AuthPage = lazy(() => retryImport(() => import("./pages/AuthPage")));
const DeviceTestMatrix = lazy(() => retryImport(() => import("./pages/DeviceTestMatrix")));

// Note: Large components are already optimized with code splitting

// Legacy redirect for old pro trip URLs using hyphen format
const LegacyProTripRedirect = () => {
  const { proTripId } = useParams();
  return <Navigate to={`/tour/pro/${proTripId}`} replace />;
};

const queryClient = new QueryClient();

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

// ⚡ PERFORMANCE: Initialize demo mode synchronously at module load
useDemoModeStore.getState().init();

const App = () => {
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
        errorTracking.setUser(data.user.id, {
          email: data.user.email
        });
      }
    });
  }, []);

  // Setup global offline sync processor
  useEffect(() => {
    return setupGlobalSyncProcessor();
  }, []);


  // Breaking-only version check - only triggers for true breaking changes (manually incremented)
  useEffect(() => {
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
      console.log('[App] Breaking version change detected, reloading silently');
      if ('caches' in window) {
        caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))));
      }
      localStorage.setItem(BREAKING_VERSION_KEY, CURRENT_BREAKING_VERSION);
      window.location.reload();
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
      window.location.reload();
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
        console.error('[App] Chunk loading error detected:', error);
        toastShown = true;

        toast({
          title: "Loading Error",
          description: "Failed to load page. This usually happens after an app update. Clear cache to continue.",
          action: (
            <button
              onClick={clearCachesAndReload}
              className="px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Clear Cache & Reload
            </button>
          ),
          duration: 20000,
        });
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
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ConsumerSubscriptionProvider>
            <AppInitializer>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                
                <BuildBadge />
                <OfflineIndicator />
                {/* All components using react-router hooks must render inside <Router> */}
                <Router>
                <ExitDemoButtonWithNav />
                <NativeLifecycleBridge client={queryClient} />
                <MobileAppLayout>
                  <Routes>
                    <Route path="/" element={
                      <LazyRoute>
                        <Index />
                      </LazyRoute>
                    } />
                    <Route path="/trip/:tripId" element={
                      <LazyRoute>
                        <TripDetail />
                      </LazyRoute>
                    } />
                    <Route path="/trip/:tripId/preview" element={
                      <LazyRoute>
                        <TripPreview />
                      </LazyRoute>
                    } />
                    <Route path="/demo/trip/:demoTripId" element={
                      <LazyRoute>
                        <DemoTripGate />
                      </LazyRoute>
                    } />
                    <Route path="/demo" element={
                      <LazyRoute>
                        <DemoEntry />
                      </LazyRoute>
                    } />
                    <Route path="/auth" element={
                      <LazyRoute>
                        <AuthPage />
                      </LazyRoute>
                    } />
                    <Route path="/join/:token" element={
                      <LazyRoute>
                        <JoinTrip />
                      </LazyRoute>
                    } />
                    <Route path="/tour/pro/:proTripId" element={
                      <LazyRoute>
                        <ProTripDetail />
                      </LazyRoute>
                    } />
                    <Route path="/tour/pro-:proTripId" element={
                      <LazyRoute>
                        <LegacyProTripRedirect />
                      </LazyRoute>
                    } />
                    <Route path="/event/:eventId" element={
                      <LazyRoute>
                        <EventDetail />
                      </LazyRoute>
                    } />
                    <Route path="/teams" element={
                      <LazyRoute>
                        <ForTeams />
                      </LazyRoute>
                    } />
                    <Route path="/recs" element={
                      <LazyRoute>
                        <ChravelRecsPage />
                      </LazyRoute>
                    } />
                    <Route path="/advertiser" element={
                      <LazyRoute>
                        <AdvertiserDashboard />
                      </LazyRoute>
                    } />
                    <Route path="/healthz" element={
                      <LazyRoute>
                        <Healthz />
                      </LazyRoute>
                    } />
                    <Route path="/privacy" element={
                      <LazyRoute>
                        <PrivacyPolicy />
                      </LazyRoute>
                    } />
                    <Route path="/terms" element={
                      <LazyRoute>
                        <TermsOfService />
                      </LazyRoute>
                    } />
                    <Route path="/profile" element={
                      <LazyRoute>
                        <ProfilePage />
                      </LazyRoute>
                    } />
                    <Route path="/settings" element={
                      <LazyRoute>
                        <SettingsPage />
                      </LazyRoute>
                    } />
                    <Route path="/archive" element={
                      <LazyRoute>
                        <ArchivePage />
                      </LazyRoute>
                    } />
                    <Route path="/admin/scheduled-messages" element={
                      <LazyRoute>
                        <AdminDashboard />
                      </LazyRoute>
                    } />
                    <Route path="/organizations" element={
                      <LazyRoute>
                        <OrganizationsHub />
                      </LazyRoute>
                    } />
                    <Route path="/organization/:orgId" element={
                      <LazyRoute>
                        <OrganizationDashboard />
                      </LazyRoute>
                    } />
                    <Route path="/accept-invite/:token" element={
                      <LazyRoute>
                        <AcceptOrganizationInvite />
                      </LazyRoute>
                    } />
                    <Route path="/dev/device-matrix" element={
                      <LazyRoute>
                        <DeviceTestMatrix />
                      </LazyRoute>
                    } />
                    <Route path="*" element={
                      <LazyRoute>
                        <NotFound />
                      </LazyRoute>
                    } />
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
