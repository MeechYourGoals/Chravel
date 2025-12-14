import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TripVariantProvider } from "@/contexts/TripVariantContext";
import { BasecampProvider } from "@/contexts/BasecampContext";
import { registerServiceWorker } from "./utils/serviceWorkerRegistration";
import App from "./App.tsx";
import "./index.css";

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
