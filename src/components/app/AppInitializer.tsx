import { useEffect } from 'react';
import { useApiHealth } from '@/hooks/useApiHealth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useAuth } from '@/hooks/useAuth';

/**
 * AppInitializer - Runs API health checks on app startup
 * Skips health checks in demo mode to prevent "offline" noise
 */
export const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  
  // Only run health checks for authenticated users NOT in demo mode
  const shouldRunHealthChecks = user && !isDemoMode;
  const { isInitialized, conciergeStatus, mapsStatus } = useApiHealth(shouldRunHealthChecks);


  // CSP violation monitoring
  useEffect(() => {
    const handleCSPViolation = (e: SecurityPolicyViolationEvent) => {
      console.warn('[CSP] Blocked:', {
        directive: e.violatedDirective,
        blockedURI: e.blockedURI,
        effectiveDirective: e.effectiveDirective,
        disposition: e.disposition
      });
    };

    window.addEventListener('securitypolicyviolation', handleCSPViolation);
    return () => window.removeEventListener('securitypolicyviolation', handleCSPViolation);
  }, []);

  return <>{children}</>;
};
