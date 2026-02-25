import { toast } from '@/hooks/use-toast';

export interface ErrorContext {
  operation: string;
  userId?: string;
  tripId?: string;
  metadata?: Record<string, any>;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: ErrorContext,
    public originalError?: any,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandlingService = {
  /**
   * Handle errors with user-friendly toast notifications
   */
  handleError(error: any, context?: ErrorContext): void {
    console.error('[Error]', { error, context });

    const errorMessage = this.getErrorMessage(error);
    const errorCode = this.getErrorCode(error);

    // Show toast to user
    toast({
      variant: 'destructive',
      title: this.getErrorTitle(errorCode),
      description: errorMessage,
      duration: 5000,
    });

    // Log to external service in production
    if (import.meta.env.PROD) {
      this.logToExternalService(error, context);
    }
  },

  /**
   * Extract user-friendly error message
   */
  getErrorMessage(error: any): string {
    if (error instanceof AppError) {
      return error.message;
    }

    if (error?.message) {
      // Handle common Supabase errors
      if (error.message.includes('JWT')) {
        return 'Your session has expired. Please sign in again.';
      }
      if (error.message.includes('network')) {
        return 'Network error. Please check your connection.';
      }
      if (error.message.includes('timeout')) {
        return 'Request timed out. Please try again.';
      }
      if (error.message.includes('permission')) {
        return "You don't have permission to perform this action.";
      }
      return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
  },

  /**
   * Get error code for categorization
   */
  getErrorCode(error: any): string {
    if (error instanceof AppError) {
      return error.code;
    }
    if (error?.code) {
      return error.code;
    }
    return 'UNKNOWN_ERROR';
  },

  /**
   * Get error title based on code
   */
  getErrorTitle(code: string): string {
    const titles: Record<string, string> = {
      NETWORK_ERROR: 'Connection Error',
      AUTH_ERROR: 'Authentication Error',
      PERMISSION_ERROR: 'Permission Denied',
      VALIDATION_ERROR: 'Invalid Input',
      NOT_FOUND: 'Not Found',
      CONFLICT: 'Conflict Detected',
      UNKNOWN_ERROR: 'Error',
    };

    return titles[code] || 'Error';
  },

  /**
   * Log error to external service (placeholder)
   */
  logToExternalService(error: any, context?: ErrorContext): void {
    // In production, send to Sentry, LogRocket, etc.
    console.log('[External Log]', { error, context });
  },

  /**
   * Create a standardized error
   */
  createError(
    message: string,
    code: string,
    context?: ErrorContext,
    originalError?: any,
  ): AppError {
    return new AppError(message, code, context, originalError);
  },
};
