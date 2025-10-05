
import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ConsumerSubscriptionProvider } from "./hooks/useConsumerSubscription";
import { MobileAppLayout } from "./components/mobile/MobileAppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LazyRoute } from "./components/LazyRoute";
import { performanceService } from "./services/performanceService";
import { useDemoModeStore } from "./store/demoModeStore";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const TripDetail = lazy(() => import("./pages/TripDetail"));
const ItineraryAssignmentPage = lazy(() => import("./pages/ItineraryAssignmentPage"));
const ProTripDetail = lazy(() => import("./pages/ProTripDetail"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const JoinTrip = lazy(() => import("./pages/JoinTrip"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const MorePage = lazy(() => import("./pages/MorePage"));
const ArchivePage = lazy(() => import("./pages/ArchivePage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard").then(module => ({ default: module.AdminDashboard })));
const OrganizationDashboard = lazy(() => import("./pages/OrganizationDashboard").then(module => ({ default: module.OrganizationDashboard })));
const OrganizationsHub = lazy(() => import("./pages/OrganizationsHub").then(module => ({ default: module.OrganizationsHub })));
const MobileEnterpriseHub = lazy(() => import("./pages/MobileEnterpriseHub").then(module => ({ default: module.MobileEnterpriseHub })));
const MobileOrganizationPage = lazy(() => import("./pages/MobileOrganizationPage").then(module => ({ default: module.MobileOrganizationPage })));
const AcceptOrganizationInvite = lazy(() => import("./pages/AcceptOrganizationInvite").then(module => ({ default: module.AcceptOrganizationInvite })));


const queryClient = new QueryClient();

const App = () => {
  // Track app initialization performance
  const stopTiming = performanceService.startTiming('App Initialization');
  
  React.useEffect(() => {
    stopTiming();
  }, [stopTiming]);

  // Initialize demo mode store once on mount
  useEffect(() => {
    useDemoModeStore.getState().init();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ConsumerSubscriptionProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
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
                    <Route path="/more" element={
                      <LazyRoute>
                        <MorePage />
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
                    <Route path="/enterprise" element={
                      <LazyRoute>
                        <MobileEnterpriseHub />
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
              </BrowserRouter>
            </TooltipProvider>
          </ConsumerSubscriptionProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
