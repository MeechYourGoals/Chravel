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
      } catch (error) {
        console.error('Error during context polling:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop polling for context updates
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.isPolling = false;
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
      interval: this.pollInterval ? 30000 : undefined,
    };
  }

  /**
   * Force immediate context refresh
   */
  forceRefresh(tripId: string, onUpdate: () => void): void {
    ContextCacheService.invalidate(tripId);
    onUpdate();
  }
}

// Export singleton instance
export const contextPollService = new ContextPollService();
