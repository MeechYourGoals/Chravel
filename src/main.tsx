import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TripVariantProvider } from "@/contexts/TripVariantContext";
import { BasecampProvider } from "@/contexts/BasecampContext";
import { registerServiceWorker } from "./utils/serviceWorkerRegistration";
import App from "./App.tsx";
import "./index.css";

// Temporary: Kill any stale service workers and caches on next load
// NOTE: Remove in a follow-up release or replace with proper SW update flow
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.getRegistrations?.().then((regs) => regs.forEach((r) => r.unregister()));
    // Clear all caches created by older builds
    // @ts-ignore - optional chaining on caches for older browsers
    caches?.keys?.().then((keys: string[]) => keys.forEach((k) => caches.delete(k)));
  } catch (err) {
    // Best-effort cleanup; ignore errors
    console.warn('[SW] Cleanup failed', err);
  }
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
