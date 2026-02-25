// Rate limiting utility
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  checkLimit(key: string, maxAttempts: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const existing = this.attempts.get(key);

    if (!existing || now > existing.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (existing.count >= maxAttempts) {
      return false;
    }

    existing.count++;
    return true;
  }

  getRemainingAttempts(key: string, maxAttempts: number = 10): number {
    const existing = this.attempts.get(key);
    if (!existing || Date.now() > existing.resetTime) {
      return maxAttempts;
    }
    return Math.max(0, maxAttempts - existing.count);
  }
}

export const rateLimiter = new RateLimiter();

// Optimistic locking utility
export class OptimisticLockError extends Error {
  constructor(
    message: string = 'Data has been modified by another user. Please refresh and try again.',
  ) {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

// Retry utility with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on optimistic lock errors or authentication errors
      if (
        error instanceof OptimisticLockError ||
        (error as any)?.message?.includes('not authenticated') ||
        (error as any)?.code === 'PGRST116'
      ) {
        throw error;
      }

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Toast function type for conflict error handling
type ToastFunction = (options: {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}) => void;

// Conflict resolution utility - accepts toast function as parameter
// Usage: handleConflictError(error, toast, 'item')
export function handleConflictError(
  error: any,
  toast: ToastFunction,
  entityType: string = 'item',
): void {
  if (error.message?.includes('conflict') || error.message?.includes('modified by another user')) {
    toast({
      title: 'Conflict Detected',
      description: `This ${entityType} has been modified by another user. Please refresh and try again.`,
      variant: 'destructive',
    });
    return;
  }

  if (error.message?.includes('already been settled')) {
    toast({
      title: 'Already Settled',
      description: 'This payment has already been settled by another user.',
      variant: 'destructive',
    });
    return;
  }

  if (error.message?.includes('Time conflict detected')) {
    toast({
      title: 'Schedule Conflict',
      description: 'There is already an event scheduled during this time.',
      variant: 'destructive',
    });
    return;
  }

  if (error.message?.includes('already voted')) {
    toast({
      title: 'Already Voted',
      description: 'You have already voted on this option.',
      variant: 'destructive',
    });
    return;
  }

  // Generic error handling
  toast({
    title: 'Error',
    description: error.message || `Failed to update ${entityType}. Please try again.`,
    variant: 'destructive',
  });
}

// Connection health monitor
export class ConnectionMonitor {
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    window.addEventListener('online', () => this.setOnline(true));
    window.addEventListener('offline', () => this.setOnline(false));
  }

  private setOnline(online: boolean) {
    this.isOnline = online;
    this.listeners.forEach(listener => listener(online));
  }

  public getStatus(): boolean {
    return this.isOnline;
  }

  public subscribe(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const connectionMonitor = new ConnectionMonitor();

// Queue for offline operations
export class OfflineQueue {
  private queue: Array<{
    id: string;
    operation: () => Promise<any>;
    retryCount: number;
  }> = [];

  private isProcessing: boolean = false;

  constructor() {
    connectionMonitor.subscribe(online => {
      if (online && this.queue.length > 0) {
        this.processQueue();
      }
    });
  }

  add(id: string, operation: () => Promise<any>) {
    this.queue.push({ id, operation, retryCount: 0 });

    if (connectionMonitor.getStatus()) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0 && connectionMonitor.getStatus()) {
      const item = this.queue.shift()!;

      try {
        await item.operation();
      } catch (error) {
        item.retryCount++;

        if (item.retryCount < 3) {
          this.queue.unshift(item); // Put back at front for retry
        } else {
          console.error(`Failed to process queued operation ${item.id} after 3 attempts:`, error);
        }
      }
    }

    this.isProcessing = false;
  }
}

export const offlineQueue = new OfflineQueue();

// Debounce utility for reducing rapid-fire mutations
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;

  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

// Throttle utility for rate limiting
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
  let inThrottle: boolean;

  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}
