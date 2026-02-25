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

  // CSP violation monitoring with error safety
  useEffect(() => {
    try {
      const handleCSPViolation = (e: SecurityPolicyViolationEvent) => {
        try {
          console.warn('[CSP] Blocked:', {
            directive: e.violatedDirective,
            blockedURI: e.blockedURI,
            effectiveDirective: e.effectiveDirective,
            disposition: e.disposition,
          });
        } catch (error) {
          console.error('[CSP] Error handling violation:', error);
        }
      };

      window.addEventListener('securitypolicyviolation', handleCSPViolation);
      return () => {
        try {
          window.removeEventListener('securitypolicyviolation', handleCSPViolation);
        } catch (error) {
          console.error('[CSP] Error removing listener:', error);
        }
      };
    } catch (error) {
      console.error('[AppInitializer] Error setting up CSP monitoring:', error);
    }
  }, []);

  return <>{children}</>;
};
