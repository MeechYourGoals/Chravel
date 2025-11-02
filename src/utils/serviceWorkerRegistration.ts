export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Register SW with build version to force update on new deploys
      const buildId = import.meta.env.VITE_BUILD_ID || Date.now().toString();
      const swUrl = `/sw.js?v=${buildId}`;
      
      console.log(`[SW] Registering service worker with version: ${buildId}`);
      const registration = await navigator.serviceWorker.register(swUrl, {
        updateViaCache: 'none' // Always check for SW updates
      });
      
      console.log('[SW] Service Worker registered:', registration);
      
      // Check for updates on registration
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[SW] Update found, installing new service worker...');
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            console.log('[SW] New worker state:', newWorker.state);
            
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New service worker installed, will activate on next navigation');
              
              // Optionally notify user about update
              // You can show a toast here if needed
            }
          });
        }
      });
      
      // Auto-reload when new SW takes control (after skipWaiting)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] New service worker activated, reloading page...');
        window.location.reload();
      });
      
      // Check for updates periodically (every 60 seconds)
      setInterval(() => {
        registration.update().catch(err => 
          console.warn('[SW] Update check failed:', err)
        );
      }, 60000);
      
    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error);
    }
  }
};

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
};
