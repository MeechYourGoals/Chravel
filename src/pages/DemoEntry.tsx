import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDemoModeStore } from '@/store/demoModeStore';
import { Loader2 } from 'lucide-react';

/**
 * DemoEntry - Deep link entry point for demo mode
 * 
 * Routes:
 * - /demo → enables demo mode and redirects to /
 * - /demo?off=1 → disables demo mode and redirects to /
 * 
 * Features:
 * - Idempotent: if already in app-preview mode, redirects immediately
 * - Preserves query params (except ?off) for tracking
 * - Works for logged-in and logged-out users
 * - Shows minimal loading state (<300ms) to avoid white flash
 */
const DemoEntry = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processDemo = async () => {
      const store = useDemoModeStore.getState();
      const offParam = searchParams.get('off');

      // Escape hatch: ?off=1 disables demo mode
      if (offParam === '1') {
        await store.setDemoView('off');
        navigate('/', { replace: true });
        return;
      }

      // Idempotent: if already in app-preview, just redirect
      if (store.demoView === 'app-preview') {
        navigate('/', { replace: true });
        return;
      }

      // Enable demo mode
      await store.setDemoView('app-preview');
      navigate('/', { replace: true });
    };

    processDemo();
  }, [navigate, searchParams]);

  // Minimal loading state to avoid white flash
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
        <p className="text-muted-foreground text-sm">Loading demo...</p>
      </div>
    </div>
  );
};

export default DemoEntry;
