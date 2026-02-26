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

// TEMPORARY: Kill stale service workers once (remove after one release cycle)
// if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
//   navigator.serviceWorker.getRegistrations?.().then(regs => {
//     regs.forEach(r => r.unregister());
//   }).catch(err => console.warn('[SW] Could not clear service workers:', err));

//   if ('caches' in window) {
//     caches.keys?.().then(keys => {
//       keys.forEach(k => caches.delete(k));
//     }).catch(err => console.warn('[SW] Could not clear caches:', err));
//   }
// }

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
