import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TripVariantProvider } from "@/contexts/TripVariantContext";
import { BasecampProvider } from "@/contexts/BasecampContext";
import { registerServiceWorker } from "./utils/serviceWorkerRegistration";
import App from "./App.tsx";
import "./index.css";

// TEMPORARY: Kill stale service workers once (remove after one release cycle)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations?.().then(regs => regs.forEach(r => r.unregister()));
  caches?.keys?.().then(keys => keys.forEach(k => caches.delete(k)));
  console.log('[SW] Cleared stale service workers and caches');
}

// Register service worker for offline support
if (import.meta.env.PROD) {
  registerServiceWorker();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider>
      <TripVariantProvider variant="consumer">
        <BasecampProvider>
          <App />
        </BasecampProvider>
      </TripVariantProvider>
    </TooltipProvider>
  </StrictMode>,
);
