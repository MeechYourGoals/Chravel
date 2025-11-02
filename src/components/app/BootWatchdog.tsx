import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw } from 'lucide-react';

export const BootWatchdog = () => {
  const [showRecovery, setShowRecovery] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    // If app hasn't rendered within 6 seconds, show recovery UI
    const timer = setTimeout(() => {
      setShowRecovery(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  const handleHardRefresh = async () => {
    setIsRecovering(true);
    
    const isPreview = window.location.hostname.endsWith('lovableproject.com');
    
    if (isPreview) {
      // Clear everything in preview
      try {
        // Unregister service workers
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
        
        // Clear all caches
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        
        // Clear localStorage/sessionStorage
        localStorage.clear();
        sessionStorage.clear();
      } catch (err) {
        console.error('Cleanup failed:', err);
      }
    }
    
    // Hard reload
    window.location.reload();
  };

  if (!showRecovery) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Alert className="max-w-md">
        <AlertDescription className="space-y-4">
          <p className="font-semibold">Preview Loading Issue</p>
          <p className="text-sm text-muted-foreground">
            The app is taking longer than expected to load. This can happen after code changes.
          </p>
          <Button 
            onClick={handleHardRefresh}
            disabled={isRecovering}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isRecovering ? 'Refreshing...' : 'Hard Refresh'}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};
