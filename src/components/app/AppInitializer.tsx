import { useEffect } from 'react';
import { useApiHealth } from '@/hooks/useApiHealth';

/**
 * AppInitializer - Runs API health checks on app startup
 * Place this component at the root of your app
 */
export const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const { isInitialized, conciergeStatus, mapsStatus } = useApiHealth();

  useEffect(() => {
    if (isInitialized) {
      console.log('✅ App Initialization Complete');
      console.log('   - AI Concierge:', conciergeStatus?.status || 'unknown');
      console.log('   - Google Maps:', mapsStatus?.status || 'unknown');
    }
  }, [isInitialized, conciergeStatus, mapsStatus]);

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
