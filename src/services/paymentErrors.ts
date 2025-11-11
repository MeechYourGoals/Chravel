// @ts-nocheck
/**
 * Payment Error Types and Utilities
 * Comprehensive error handling for payment operations
 */

export enum PaymentErrorCode {
  // Insufficient Funds
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  ACCOUNT_BALANCE_LOW = 'ACCOUNT_BALANCE_LOW',
  
  // Payment Method Failures
  PAYMENT_METHOD_DECLINED = 'PAYMENT_METHOD_DECLINED',
  PAYMENT_METHOD_EXPIRED = 'PAYMENT_METHOD_EXPIRED',
  PAYMENT_METHOD_INVALID = 'PAYMENT_METHOD_INVALID',
  PAYMENT_METHOD_NOT_FOUND = 'PAYMENT_METHOD_NOT_FOUND',
  
  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Validation Errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_CURRENCY = 'INVALID_CURRENCY',
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // Configuration Errors
  PROCESSOR_NOT_CONFIGURED = 'PROCESSOR_NOT_CONFIGURED',
  API_KEY_INVALID = 'API_KEY_INVALID',
  
  // Unknown Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  PROCESSING_FAILED = 'PROCESSING_FAILED'
}

export interface PaymentErrorDetails {
  code: PaymentErrorCode | string;
  message: string;
  type: 'insufficient_funds' | 'payment_method_failed' | 'network_error' | 'invalid_request' | 'rate_limit' | 'unknown';
  retryable: boolean;
  originalError?: unknown;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export class PaymentError extends Error {
  public readonly code: PaymentErrorCode | string;
  public readonly type: PaymentErrorDetails['type'];
  public readonly retryable: boolean;
  public readonly originalError?: unknown;
  public readonly metadata?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(details: PaymentErrorDetails) {
    super(details.message);
    this.name = 'PaymentError';
    this.code = details.code;
    this.type = details.type;
    this.retryable = details.retryable;
    this.originalError = details.originalError;
    this.metadata = details.metadata;
    this.timestamp = details.timestamp;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PaymentError);
    }
  }

  /**
   * Create an insufficient funds error
   */
  static insufficientFunds(amount: number, available: number, metadata?: Record<string, unknown>): PaymentError {
    return new PaymentError({
      code: PaymentErrorCode.INSUFFICIENT_FUNDS,
      message: `Insufficient funds. Required: ${amount}, Available: ${available}`,
      type: 'insufficient_funds',
      retryable: false,
      metadata: { amount, available, ...metadata },
      timestamp: new Date()
    });
  }

  /**
   * Create a payment method failure error
   */
  static paymentMethodFailed(reason: string, metadata?: Record<string, unknown>): PaymentError {
    return new PaymentError({
      code: PaymentErrorCode.PAYMENT_METHOD_DECLINED,
      message: `Payment method failed: ${reason}`,
      type: 'payment_method_failed',
      retryable: false,
      metadata,
      timestamp: new Date()
    });
  }

  /**
   * Create a network error
   */
  static networkError(message: string, originalError?: unknown, retryable: boolean = true): PaymentError {
    return new PaymentError({
      code: PaymentErrorCode.NETWORK_ERROR,
      message,
      type: 'network_error',
      retryable,
      originalError,
      timestamp: new Date()
    });
  }

  /**
   * Create an invalid request error
   */
  static invalidRequest(message: string, metadata?: Record<string, unknown>): PaymentError {
    return new PaymentError({
      code: PaymentErrorCode.INVALID_REQUEST,
      message,
      type: 'invalid_request',
      retryable: false,
      metadata,
      timestamp: new Date()
    });
  }

  /**
   * Create a rate limit error
   */
  static rateLimitExceeded(retryAfter?: number): PaymentError {
    return new PaymentError({
      code: PaymentErrorCode.RATE_LIMIT_EXCEEDED,
      message: `Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}s` : ''}`,
      type: 'rate_limit',
      retryable: true,
      metadata: { retryAfter },
      timestamp: new Date()
    });
  }

  /**
   * Convert to JSON for logging/API responses
   */
  toJSON(): PaymentErrorDetails {
    return {
      code: this.code,
      message: this.message,
      type: this.type,
      retryable: this.retryable,
      originalError: this.originalError,
      metadata: this.metadata,
      timestamp: this.timestamp
    };
  }
}

/**
 * Error handler utility
 */
export class PaymentErrorHandler {
  /**
   * Handle payment error and determine if retryable
   */
  static handleError(error: unknown): PaymentError {
    if (error instanceof PaymentError) {
      return error;
    }

    if (error instanceof Error) {
      // Try to classify the error
      const message = error.message.toLowerCase();
      
      if (message.includes('insufficient') || message.includes('balance')) {
        return PaymentError.insufficientFunds(0, 0, { originalError: error });
      }
      
      if (message.includes('declined') || message.includes('failed')) {
        return PaymentError.paymentMethodFailed(error.message);
      }
      
      if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
        return PaymentError.networkError(error.message, error);
      }
      
      if (message.includes('rate limit') || message.includes('too many')) {
        return PaymentError.rateLimitExceeded();
      }
    }

    // Unknown error
    return new PaymentError({
      code: PaymentErrorCode.UNKNOWN_ERROR,
      message: error instanceof Error ? error.message : 'Unknown payment error',
      type: 'unknown',
      retryable: false,
      originalError: error,
      timestamp: new Date()
    });
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: unknown): boolean {
    const paymentError = this.handleError(error);
    return paymentError.retryable;
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: unknown): string {
    const paymentError = this.handleError(error);
    
    const userMessages: Record<PaymentErrorCode, string> = {
      [PaymentErrorCode.INSUFFICIENT_FUNDS]: 'You don\'t have enough funds to complete this payment.',
      [PaymentErrorCode.PAYMENT_METHOD_DECLINED]: 'Your payment method was declined. Please try a different method.',
      [PaymentErrorCode.PAYMENT_METHOD_EXPIRED]: 'Your payment method has expired. Please update it.',
      [PaymentErrorCode.NETWORK_ERROR]: 'Network error occurred. Please check your connection and try again.',
      [PaymentErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment and try again.',
      [PaymentErrorCode.INVALID_AMOUNT]: 'Invalid payment amount.',
      [PaymentErrorCode.INVALID_RECIPIENT]: 'Invalid recipient information.',
      [PaymentErrorCode.PROCESSOR_NOT_CONFIGURED]: 'Payment processor is not configured.',
      [PaymentErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
      [PaymentErrorCode.PROCESSING_FAILED]: 'Payment processing failed. Please try again.',
      [PaymentErrorCode.ACCOUNT_BALANCE_LOW]: 'Your account balance is too low.',
      [PaymentErrorCode.PAYMENT_METHOD_INVALID]: 'Invalid payment method.',
      [PaymentErrorCode.PAYMENT_METHOD_NOT_FOUND]: 'Payment method not found.',
      [PaymentErrorCode.TIMEOUT]: 'Request timed out. Please try again.',
      [PaymentErrorCode.SERVICE_UNAVAILABLE]: 'Payment service is temporarily unavailable.',
      [PaymentErrorCode.INVALID_CURRENCY]: 'Invalid currency.',
      [PaymentErrorCode.MISSING_REQUIRED_FIELD]: 'Missing required payment information.',
      [PaymentErrorCode.TOO_MANY_REQUESTS]: 'Too many requests. Please wait.',
      [PaymentErrorCode.API_KEY_INVALID]: 'Invalid API configuration.'
    };

    return userMessages[paymentError.code as PaymentErrorCode] || paymentError.message;
  }
}
