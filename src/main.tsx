import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TripVariantProvider } from "@/contexts/TripVariantContext";
import { BasecampProvider } from "@/contexts/BasecampContext";
import { registerServiceWorker } from "./utils/serviceWorkerRegistration";
import App from "./App.tsx";
import "./index.css";

// TEMPORARY: Kill stale service workers once (remove after one release cycle)
// if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
//   navigator.serviceWorker.getRegistrations?.().then(regs => {
//     regs.forEach(r => r.unregister());
//     console.log('[SW] Cleared stale service workers');
//   }).catch(err => console.warn('[SW] Could not clear service workers:', err));
  
//   if ('caches' in window) {
//     caches.keys?.().then(keys => {
//       keys.forEach(k => caches.delete(k));
//       console.log('[SW] Cleared caches');
//     }).catch(err => console.warn('[SW] Could not clear caches:', err));
//   }
// }

// Register service worker for offline support
if (import.meta.env.PROD) {
  registerServiceWorker();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TripVariantProvider variant="consumer">
      <BasecampProvider>
        <App />
      </BasecampProvider>
    </TripVariantProvider>
  </StrictMode>,
);
