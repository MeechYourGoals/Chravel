import { ContextCacheService } from './contextCacheService';

export class ContextPollService {
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  /**
   * Start polling for context updates
   */
  startPolling(tripId: string, onUpdate: () => void, intervalMs = 30000): void {
    this.stopPolling();
    
    this.isPolling = true;
    this.pollInterval = setInterval(async () => {
      try {
        // Invalidate cache to force fresh data on next request
        ContextCacheService.invalidate(tripId);
        
        // Trigger update callback
        onUpdate();
        
        console.log(`Context cache invalidated for trip ${tripId}`);
      } catch (error) {
        console.error('Error during context polling:', error);
      }
    }, intervalMs);
    
    console.log(`Started context polling for trip ${tripId} (${intervalMs}ms interval)`);
  }

  /**
   * Stop polling for context updates
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.isPolling = false;
      console.log('Stopped context polling');
    }
  }

  /**
   * Check if currently polling
   */
  isActive(): boolean {
    return this.isPolling;
  }

  /**
   * Get polling status
   */
  getStatus(): {
    isPolling: boolean;
    interval?: number;
  } {
    return {
      isPolling: this.isPolling,
      interval: this.pollInterval ? 30000 : undefined
    };
  }

  /**
   * Force immediate context refresh
   */
  forceRefresh(tripId: string, onUpdate: () => void): void {
    ContextCacheService.invalidate(tripId);
    onUpdate();
    console.log(`Forced context refresh for trip ${tripId}`);
  }
}

// Export singleton instance
export const contextPollService = new ContextPollService();
