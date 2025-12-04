
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
const ItineraryAssignmentPage = lazy(() => retryImport(() => import("./pages/ItineraryAssignmentPage")));
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


  // Chunk load failure recovery with better error detection
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason?.message || String(event.reason);
      const errorString = String(event.reason);
      
      const isChunkError = 
        error.includes('Loading chunk') || 
        error.includes('Failed to fetch dynamically imported') ||
        error.includes('Failed to fetch') ||
        errorString.includes('Failed to fetch dynamically imported') ||
        errorString.includes('Loading chunk');
      
      if (isChunkError) {
        console.error('Chunk loading error detected:', error);
        
        // Prevent multiple toasts
        const existingToast = document.querySelector('[data-sonner-toast]');
        if (existingToast) return;
        
        toast({
          title: "Loading Error",
          description: "Failed to load page. This may be due to a network issue or outdated cache. Please refresh.",
          action: (
            <button
              onClick={() => {
                // Clear cache and reload
                if ('caches' in window) {
                  caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                  });
                }
                window.location.reload();
              }}
              className="px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Refresh
            </button>
          ),
          duration: 15000,
        });
      }
    };
    
    // Also handle error events
    const handleError = (event: ErrorEvent) => {
      const error = event.message || String(event.error);
      if (error.includes('Failed to fetch dynamically imported') || error.includes('Loading chunk')) {
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
