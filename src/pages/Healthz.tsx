import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function Healthz() {
  const buildId = import.meta.env.VITE_BUILD_ID ?? 'dev';
  const mode = import.meta.env.MODE;
  
  const [runtimeChecks, setRuntimeChecks] = useState({
    envPresent: false,
    isPreview: false,
    localStorageAvailable: false,
    supabaseSession: null as string | null,
    supabaseDBReachable: false,
    cspViolations: 0
  });

  useEffect(() => {
    const checkLocalStorage = () => {
      try {
        const t = '__health_probe__';
        localStorage.setItem(t, '1');
        localStorage.removeItem(t);
        return true;
      } catch {
        return false;
      }
    };

    const runChecks = async () => {
      const env = (import.meta as any)?.env ?? {};
      const isPreview = typeof window !== 'undefined' && window.location.hostname.endsWith('lovableproject.com');
      
      let sessionStatus = null;
      let dbReachable = false;

      try {
        const { data } = await supabase.auth.getSession();
        sessionStatus = data.session ? 'active' : 'none';
      } catch {
        sessionStatus = 'error';
      }

      try {
        const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        dbReachable = !error;
      } catch {
        dbReachable = false;
      }

      setRuntimeChecks({
        envPresent: !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY),
        isPreview,
        localStorageAvailable: checkLocalStorage(),
        supabaseSession: sessionStatus,
        supabaseDBReachable: dbReachable,
        cspViolations: 0
      });
    };

    runChecks();
  }, []);

  const healthData = {
    buildId,
    mode,
    timestamp: new Date().toISOString(),
    features: {
      placesLinksV2: true,
      mediaLinks: false,
      serviceWorkerCleared: true,
      nominatimFallback: true,
      tripSpecificMockData: true
    },
    runtime: runtimeChecks,
    status: 'ok'
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Health Check</h1>
        <pre className="bg-gray-800 p-6 rounded-lg overflow-auto text-sm">
          {JSON.stringify(healthData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
