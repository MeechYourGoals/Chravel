import { toast } from '@/hooks/use-toast';

export interface QueuedOperation {
  id: string;
  type: string;
  operation: () => Promise<any>;
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineService {
  private isOnline: boolean = navigator.onLine;
  private queue: QueuedOperation[] = [];
  private maxRetries = 3;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    this.setupListeners();
    this.loadQueue();
  }

  private setupListeners(): void {
    window.addEventListener('online', () => {
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.handleOffline();
    });
  }

  private handleOnline(): void {
    console.log('[Offline] Connection restored');
    this.isOnline = true;
    this.notifyListeners(true);
    
    toast({
      title: 'Connection Restored',
      description: 'Syncing queued operations...',
      duration: 3000,
    });

    this.processQueue();
  }

  private handleOffline(): void {
    console.log('[Offline] Connection lost');
    this.isOnline = false;
    this.notifyListeners(false);
    
    toast({
      variant: 'destructive',
      title: 'Connection Lost',
      description: 'You are now offline. Changes will be queued.',
      duration: 5000,
    });
  }

  /**
   * Check if currently online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Subscribe to online/offline status changes
   */
  subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => listener(isOnline));
  }

  /**
   * Queue an operation for later execution
   */
  queueOperation(
    type: string,
    operation: () => Promise<any>,
    data: any
  ): void {
    const queuedOp: QueuedOperation = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queuedOp);
    this.saveQueue();

    console.log('[Offline] Operation queued:', queuedOp.id);
  }

  /**
   * Process all queued operations
   */
  async processQueue(): Promise<void> {
    if (!this.isOnline || this.queue.length === 0) {
      return;
    }

    console.log(`[Offline] Processing ${this.queue.length} queued operations`);

    const operations = [...this.queue];
    this.queue = [];

    for (const op of operations) {
      try {
        await op.operation();
        console.log('[Offline] Operation completed:', op.id);
      } catch (error) {
        console.error('[Offline] Operation failed:', op.id, error);
        
        // Retry if under max retries
        if (op.retryCount < this.maxRetries) {
          op.retryCount++;
          this.queue.push(op);
          console.log('[Offline] Operation requeued for retry:', op.id);
        } else {
          console.error('[Offline] Operation failed after max retries:', op.id);
          toast({
            variant: 'destructive',
            title: 'Sync Failed',
            description: `Failed to sync ${op.type}. Please try manually.`,
            duration: 5000,
          });
        }
      }
    }

    this.saveQueue();

    if (this.queue.length === 0) {
      toast({
        title: 'Sync Complete',
        description: 'All changes have been synced.',
        duration: 3000,
      });
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      const serializable = this.queue.map(op => ({
        id: op.id,
        type: op.type,
        data: op.data,
        timestamp: op.timestamp,
        retryCount: op.retryCount,
      }));
      localStorage.setItem('offline_queue', JSON.stringify(serializable));
    } catch (error) {
      console.error('[Offline] Failed to save queue:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const saved = localStorage.getItem('offline_queue');
      if (saved) {
        const operations = JSON.parse(saved);
        console.log('[Offline] Loaded', operations.length, 'queued operations');
        // Note: We can't restore the operation functions from localStorage
        // They need to be recreated when the service functions are called
      }
    } catch (error) {
      console.error('[Offline] Failed to load queue:', error);
    }
  }

  /**
   * Clear all queued operations
   */
  clearQueue(): void {
    this.queue = [];
    localStorage.removeItem('offline_queue');
    console.log('[Offline] Queue cleared');
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}

export const offlineService = new OfflineService();
