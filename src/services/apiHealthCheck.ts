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
      // Simple ping test with minimal payload
      const { data, error } = await supabase.functions.invoke('lovable-concierge', {
        body: {
          message: 'health_check',
          isDemoMode: true,
          config: { maxTokens: 10 }
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error === 'rate_limit' || data?.error === 'payment_required') {
        // Service is reachable but rate limited
        const status: HealthStatus = {
          service: serviceName,
          status: 'degraded',
          message: 'AI Concierge is rate limited but reachable',
          lastCheck: new Date(),
          details: { error: data.error }
        };
        this.healthStatus.set(serviceName, status);
        this.retryAttempts.set(serviceName, 0);
        return status;
      }

      // Successful response
      const status: HealthStatus = {
        service: serviceName,
        status: 'healthy',
        message: 'AI Concierge is online and ready',
        lastCheck: new Date()
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
