
import React, { lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
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
import { Navigate, useParams } from "react-router-dom";
import { isLovablePreview } from "./utils/env";
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
const TripPreview = lazy(() => retryImport(() => import("./pages/TripPreview")));

// Note: Large components are already optimized with code splitting

// Legacy redirect for old pro trip URLs using hyphen format
const LegacyProTripRedirect = () => {
  const { proTripId } = useParams();
  return <Navigate to={`/tour/pro/${proTripId}`} replace />;
};

const queryClient = new QueryClient();

// Use HashRouter in preview to avoid hosting fallback issues
const Router = isLovablePreview() ? HashRouter : BrowserRouter;

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


  // Build version check for "New Version Available" toast
  useEffect(() => {
    const BUILD_VERSION_KEY = 'chravel_build_version';

    const checkForNewVersion = () => {
      const meta = document.querySelector('meta[name="build-version"]');
      const currentVersion = meta?.getAttribute('content') || 'unknown';
      const storedVersion = localStorage.getItem(BUILD_VERSION_KEY);

      // Skip if version is placeholder or unknown
      if (currentVersion === 'unknown' || currentVersion === '__BUILD_VERSION__') return;

      // First visit - store version
      if (!storedVersion) {
        localStorage.setItem(BUILD_VERSION_KEY, currentVersion);
        return;
      }

      // New version detected
      if (currentVersion !== storedVersion) {
        console.log('[App] New version detected:', { stored: storedVersion, current: currentVersion });

        toast({
          title: "New Version Available",
          description: "A new version of Chravel is available. Click to reload and get the latest features.",
          action: (
            <button
              onClick={async () => {
                // Clear caches
                if ('caches' in window) {
                  const names = await caches.keys();
                  await Promise.all(names.map(name => caches.delete(name)));
                }
                // Update stored version
                localStorage.setItem(BUILD_VERSION_KEY, currentVersion);
                // Reload
                window.location.reload();
              }}
              className="px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Reload Now
            </button>
          ),
          duration: 30000, // Show for 30 seconds
        });
      }
    };

    // Check on mount (slight delay to ensure DOM is ready)
    const timeoutId = setTimeout(checkForNewVersion, 1000);
    return () => clearTimeout(timeoutId);
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
                <Router>
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
