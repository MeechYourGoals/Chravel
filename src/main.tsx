// Unregister stale service workers from old hosts on first load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then(registrations => {
      registrations.forEach(reg => reg.unregister());
    })
    .catch(() => {});
}

// Version-based cache busting: clear caches when app version changes
const STORED_VERSION_KEY = 'chravel_host_version';
const currentVersion = import.meta.env.VITE_APP_VERSION || '0';
const storedVersion = localStorage.getItem(STORED_VERSION_KEY);
if (storedVersion !== null && storedVersion !== currentVersion) {
  // Version changed — clear all caches and reload
  if ('caches' in window) {
    caches
      .keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .catch(() => {});
  }
  localStorage.setItem(STORED_VERSION_KEY, currentVersion);
  window.location.reload();
} else {
  localStorage.setItem(STORED_VERSION_KEY, currentVersion);
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TripVariantProvider } from '@/contexts/TripVariantContext';
import { BasecampProvider } from '@/contexts/BasecampContext';
import { initNativeLifecycle } from '@/native/lifecycle';
import { registerServiceWorker } from './utils/serviceWorkerRegistration';
import { initRevenueCat } from '@/config/revenuecat';
import { setupGlobalPurchaseListener } from '@/integrations/revenuecat/revenuecatClient';
import App from './App.tsx';
import './index.css';

// Register service worker for offline support
if (import.meta.env.PROD) {
  registerServiceWorker();
}

// Initialize native lifecycle listeners as early as possible (no-op on web).
initNativeLifecycle();

// Initialize RevenueCat for subscription management
initRevenueCat().catch(err => console.warn('[RevenueCat] Init failed:', err));

// Initialize global listener for native purchases
setupGlobalPurchaseListener();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TripVariantProvider variant="consumer">
      <BasecampProvider>
        <App />
      </BasecampProvider>
    </TripVariantProvider>
  </StrictMode>,
);
