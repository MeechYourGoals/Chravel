
import React, { Suspense, lazy, useEffect } from "react";
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
import { Navigate, useParams } from "react-router-dom";
import { isLovablePreview } from "./utils/env";
import { toast } from "@/hooks/use-toast";
import { setupGlobalSyncProcessor } from "./services/globalSyncProcessor";

// Lazy load pages for better performance
const retryImport = <T,>(importFn: () => Promise<T>, retries = 3): Promise<T> => {
  return new Promise((resolve, reject) => {
    importFn()
      .then(resolve)
      .catch((error) => {
        if (retries === 0) {
          reject(error);
          return;
        }
        setTimeout(() => {
          retryImport(importFn, retries - 1).then(resolve, reject);
        }, 1000);
      });
  });
};

const Index = lazy(() => retryImport(() => import("./pages/Index")));
const TripDetail = lazy(() => retryImport(() => import("./pages/TripDetail")));
const ItineraryAssignmentPage = lazy(() => retryImport(() => import("./pages/ItineraryAssignmentPage")));
const ProTripDetail = lazy(() => retryImport(() => import("./pages/ProTripDetail")));
const EventDetail = lazy(() => retryImport(() => import("./pages/EventDetail")));
const NotFound = lazy(() => retryImport(() => import("./pages/NotFound")));
const JoinTrip = lazy(() => retryImport(() => import("./pages/JoinTrip")));
const SearchPage = lazy(() => retryImport(() => import("./pages/SearchPage")));
const ProfilePage = lazy(() => retryImport(() => import("./pages/ProfilePage")));
const SettingsPage = lazy(() => retryImport(() => import("./pages/SettingsPage")));
const ArchivePage = lazy(() => retryImport(() => import("./pages/ArchivePage")));
const AdminDashboard = lazy(() => retryImport(() => import("./pages/AdminDashboard").then(module => ({ default: module.AdminDashboard }))));
const OrganizationDashboard = lazy(() => retryImport(() => import("./pages/OrganizationDashboard").then(module => ({ default: module.OrganizationDashboard }))));
const OrganizationsHub = lazy(() => retryImport(() => import("./pages/OrganizationsHub").then(module => ({ default: module.OrganizationsHub }))));
const MobileEnterpriseHub = lazy(() => retryImport(() => import("./pages/MobileEnterpriseHub").then(module => ({ default: module.MobileEnterpriseHub }))));
const MobileOrganizationPage = lazy(() => retryImport(() => import("./pages/MobileOrganizationPage").then(module => ({ default: module.MobileOrganizationPage }))));
const AcceptOrganizationInvite = lazy(() => retryImport(() => import("./pages/AcceptOrganizationInvite").then(module => ({ default: module.AcceptOrganizationInvite }))));
const ChravelRecsPage = lazy(() => retryImport(() => import("./pages/ChravelRecsPage").then(module => ({ default: module.ChravelRecsPage }))));
const AdvertiserDashboard = lazy(() => retryImport(() => import("./pages/AdvertiserDashboard")));
const Healthz = lazy(() => retryImport(() => import("./pages/Healthz")));

// Note: Large components are already optimized with code splitting

// Legacy redirect for old pro trip URLs using hyphen format
const LegacyProTripRedirect = () => {
  const { proTripId } = useParams();
  return <Navigate to={`/tour/pro/${proTripId}`} replace />;
};

const queryClient = new QueryClient();

// Use HashRouter in preview to avoid hosting fallback issues
const Router = isLovablePreview() ? HashRouter : BrowserRouter;

const App = () => {
  const [demoModeInitialized, setDemoModeInitialized] = React.useState(false);

  // Track app initialization performance
  const stopTiming = performanceService.startTiming('App Initialization');
  
  React.useEffect(() => {
    stopTiming();
  }, [stopTiming]);

  // Initialize demo mode BEFORE rendering any components
  useEffect(() => {
    const initDemoMode = async () => {
      const timeout = new Promise((resolve) => setTimeout(() => resolve(false), 3000));
      try {
        await Promise.race([
          useDemoModeStore.getState().init(),
          timeout
        ]);
      } catch (error) {
        console.error('Demo mode init failed:', error);
      } finally {
        setDemoModeInitialized(true);
      }
    };
    initDemoMode();
  }, []);

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

  // Diagnostic banner on mount (production troubleshooting)
  useEffect(() => {
    const buildId = import.meta.env.VITE_BUILD_ID || 
                    import.meta.env.RENDER_GIT_COMMIT || 
                    import.meta.env.RENDER_GIT_COMMIT_SHA || 
                    'vdev';
    const envMode = import.meta.env.MODE;
    const inPreview = isLovablePreview();
    
    let swStatus = 'not supported';
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        swStatus = reg ? `registered (${reg.active?.scriptURL || 'pending'})` : 'not registered';
        console.log(`
╔════════════════════════════════════════════════════════╗
║  CHRAVEL DIAGNOSTICS                                   ║
╠════════════════════════════════════════════════════════╣
║  Build ID:      ${buildId.padEnd(40)} ║
║  Environment:   ${envMode.padEnd(40)} ║
║  Preview Mode:  ${String(inPreview).padEnd(40)} ║
║  Service Worker: ${swStatus.padEnd(39)} ║
╚════════════════════════════════════════════════════════╝
        `);
      });
    } else {
      console.log(`
╔════════════════════════════════════════════════════════╗
║  CHRAVEL DIAGNOSTICS                                   ║
╠════════════════════════════════════════════════════════╣
║  Build ID:      ${buildId.padEnd(40)} ║
║  Environment:   ${envMode.padEnd(40)} ║
║  Preview Mode:  ${String(inPreview).padEnd(40)} ║
║  Service Worker: ${swStatus.padEnd(39)} ║
╚════════════════════════════════════════════════════════╝
      `);
    }
  }, []);

  // Chunk load failure recovery (no auto-reload to avoid loops)
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason?.message || String(event.reason);
      
      if (error.includes('Loading chunk') || error.includes('Failed to fetch dynamically imported')) {
        console.warn('[App] Chunk load failure detected:', error);
        
        toast({
          title: "Update Available",
          description: "Click to refresh and load the latest version.",
          action: (
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Refresh
            </button>
          ),
          duration: 10000,
        });
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  // Show loading screen until demo mode is initialized
  if (!demoModeInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
      </div>
    );
  }

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
                    <Route path="/trip/:tripId/edit-itinerary" element={
                      <LazyRoute>
                        <ItineraryAssignmentPage />
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
                    <Route path="/search" element={
                      <LazyRoute>
                        <SearchPage />
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
