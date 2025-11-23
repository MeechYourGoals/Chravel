/**
 * API Health Check Service
 * Validates AI Concierge and Google Maps connectivity on app startup
 * Provides self-healing reconnection logic
 */

import { supabase } from '@/integrations/supabase/client';

export interface HealthStatus {
  service: 'concierge' | 'google_maps';
  status: 'healthy' | 'degraded' | 'offline';
  message: string;
  lastCheck: Date;
  details?: any;
}

class ApiHealthCheckService {
  private healthStatus: Map<string, HealthStatus> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private retryAttempts: Map<string, number> = new Map();
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly CHECK_INTERVAL_MS = 60000; // Check every minute

  /**
   * Initialize health checks on app startup
   */
  async initialize(): Promise<void> {
    // Immediate checks
    await Promise.all([
      this.checkConciergeHealth(),
      this.checkGoogleMapsHealth()
    ]);

    // Set up periodic health checks
    this.startPeriodicChecks();
    
    return Promise.resolve();
  }

  /**
   * Check AI Concierge connectivity
   */
  async checkConciergeHealth(): Promise<HealthStatus> {
    const serviceName = 'concierge';

    try {
      // Get isDemoMode from secure storage or local storage if available,
      // or import the store hook if we are in a component context (but we are in a service).
      // For now, we will assume we want to check the LIVE service unless strictly in demo mode.
      // However, the issue description says: "Health check sends hardcoded isDemoMode: true flag".
      // I don't see isDemoMode: true in the code I read.
      // Wait, maybe it's in the `body` of the request?
      // The code I read was:
      /*
      const { data, error } = await supabase.functions.invoke('lovable-concierge', {
        body: {
          message: 'ping'  // Simple ping, no AI processing
        }
      });
      */
      // It does NOT have isDemoMode: true.
      // BUT the user said: "Issue 6: AI Concierge Shows "Offline" for Authenticated Users... Files: aiConciergeHealthService.ts (line ~45)"
      // I checked for aiConciergeHealthService.ts and it DID NOT EXIST.
      // But I found `apiHealthCheck.ts`.
      // Maybe the file was RENAMED or the user is referring to an older version of the file structure.
      // Or maybe I missed `src/services/aiConciergeHealthService.ts`?
      // I did `ls src/services/aiConciergeHealthService.ts` and it said "No such file or directory".
      // I grep'd for `isDemoMode: true` and found nothing in `src/services`.
      // Wait, I grep'd `grep -r "isDemoMode: true" src/` and found:
      // `AUTHENTICATED_MODE_AUDIT.md:129:- src/services/aiConciergeHealthService.ts (line ~45: hardcoded isDemoMode: true)`
      // This implies the file SHOULD exist or existed.
      //
      // However, looking at `apiHealthCheck.ts`, it calls `lovable-concierge`.
      // If I add `isDemoMode: false` (or the actual value) to the body, it might fix it if the edge function defaults to something else or expects it.
      // The prompt says: "Modify src/services/aiConciergeHealthService.ts ... Remove hardcoded isDemoMode: true flag ... Pass actual useDemoMode() state".
      // Since `aiConciergeHealthService.ts` is missing, I assume `apiHealthCheck.ts` IS the replacement.
      // I will assume the user wants me to pass the correct `isDemoMode` flag.
      // Accessing the store from a service (outside a React component) requires importing the store directly.

      const { isDemoMode } = await import('@/store/demoModeStore').then(m => m.useDemoModeStore.getState());

      // Use dedicated ping endpoint that doesn't consume AI quota
      const { data, error } = await supabase.functions.invoke('lovable-concierge', {
        body: {
          message: 'ping',  // Simple ping, no AI processing
          isDemoMode // Pass the actual state
        }
      });

      if (error) {
        throw error;
      }

      // Check for successful ping response
      if (data?.status === 'healthy') {
        const status: HealthStatus = {
          service: serviceName,
          status: 'healthy',
          message: 'AI Concierge is online',
          lastCheck: new Date()
        };
        
        this.healthStatus.set(serviceName, status);
        this.retryAttempts.set(serviceName, 0);
        return status;
      }

      // If we got a response but no healthy status, mark as degraded
      const status: HealthStatus = {
        service: serviceName,
        status: 'degraded',
        message: 'AI Concierge responded but status unclear',
        lastCheck: new Date(),
        details: data
      };
      
      this.healthStatus.set(serviceName, status);
      this.retryAttempts.set(serviceName, 0);
      return status;
      
    } catch (error) {
      console.error('❌ AI Concierge health check failed:', error);
      
      const attempts = (this.retryAttempts.get(serviceName) || 0) + 1;
      this.retryAttempts.set(serviceName, attempts);
      
      const status: HealthStatus = {
        service: serviceName,
        status: 'offline',
        message: `AI Concierge is offline (attempt ${attempts}/${this.MAX_RETRY_ATTEMPTS})`,
        lastCheck: new Date(),
        details: { error: error.message }
      };
      
      this.healthStatus.set(serviceName, status);
      
      // Auto-retry with exponential backoff
      if (attempts < this.MAX_RETRY_ATTEMPTS) {
        const backoffMs = Math.pow(2, attempts) * 1000;
        setTimeout(() => this.checkConciergeHealth(), backoffMs);
      }
      
      return status;
    }
  }

  /**
   * Check Google Maps connectivity
   */
  async checkGoogleMapsHealth(): Promise<HealthStatus> {
    const serviceName = 'google_maps';

    try {
      // Check if API key is configured
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        // No API key: mark as degraded (embed-only mode) but not offline
        const status: HealthStatus = {
          service: serviceName,
          status: 'degraded',
          message: 'Embed-only mode (keyless)',
          lastCheck: new Date(),
          details: { embedMode: true }
        };
        
        this.healthStatus.set(serviceName, status);
        this.retryAttempts.set(serviceName, 0);

        return status;
      }

      // Validate key format
      if (!apiKey.startsWith('AIza') && !apiKey.startsWith('placeholder')) {
        throw new Error('Invalid Google Maps API key format');
      }

      // Test geocoding endpoint through proxy
      const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
        body: {
          endpoint: 'geocode',
          address: 'San Francisco, CA'
        }
      });

      if (error) {
        throw error;
      }

      if (!data || data.status === 'REQUEST_DENIED') {
        throw new Error('Google Maps API key not authorized for this domain');
      }

      // Successful response
      const status: HealthStatus = {
        service: serviceName,
        status: 'healthy',
        message: 'Google Maps is online with API key',
        lastCheck: new Date(),
        details: { apiKeyValid: true }
      };
      
      this.healthStatus.set(serviceName, status);
      this.retryAttempts.set(serviceName, 0);

      return status;
      
    } catch (error) {
      console.error('❌ Google Maps health check failed:', error);
      
      const attempts = (this.retryAttempts.get(serviceName) || 0) + 1;
      this.retryAttempts.set(serviceName, attempts);
      
      const status: HealthStatus = {
        service: serviceName,
        status: 'offline',
        message: `Google Maps is offline (attempt ${attempts}/${this.MAX_RETRY_ATTEMPTS})`,
        lastCheck: new Date(),
        details: { error: error.message }
      };
      
      this.healthStatus.set(serviceName, status);
      
      // Auto-retry with exponential backoff
      if (attempts < this.MAX_RETRY_ATTEMPTS) {
        const backoffMs = Math.pow(2, attempts) * 1000;
        setTimeout(() => this.checkGoogleMapsHealth(), backoffMs);
      }
      
      return status;
    }
  }

  /**
   * Get current health status for a service
   */
  getHealth(service: 'concierge' | 'google_maps'): HealthStatus | null {
    return this.healthStatus.get(service) || null;
  }

  /**
   * Get all health statuses
   */
  getAllHealth(): HealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Force re-check of all services
   */
  async recheckAll(): Promise<void> {
    await Promise.all([
      this.checkConciergeHealth(),
      this.checkGoogleMapsHealth()
    ]);
  }

  /**
   * Start periodic health checks
   */
  private startPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      await this.recheckAll();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Reset retry counter for a service
   */
  resetRetries(service: string): void {
    this.retryAttempts.set(service, 0);
  }
}

// Export singleton instance
export const apiHealthCheck = new ApiHealthCheckService();
