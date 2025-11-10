/**
 * Payment Processor Types
 * Common interfaces for payment processor adapters
 */

export interface PaymentProcessorConfig {
  apiKey?: string;
  secretKey?: string;
  environment: 'sandbox' | 'production';
  webhookSecret?: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  recipientId: string;
  recipientIdentifier: string; // Venmo username, Zelle email, etc.
  metadata?: Record<string, unknown>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  error?: PaymentError;
  metadata?: Record<string, unknown>;
}

export interface PaymentError {
  code: string;
  message: string;
  type: 'insufficient_funds' | 'payment_method_failed' | 'network_error' | 'invalid_request' | 'rate_limit' | 'unknown';
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface PaymentProcessor {
  /**
   * Process a payment request
   */
  processPayment(request: PaymentRequest): Promise<PaymentResponse>;

  /**
   * Check if payment method is available/valid
   */
  validatePaymentMethod(identifier: string): Promise<boolean>;

  /**
   * Get processor name
   */
  getName(): string;

  /**
   * Check if processor is configured
   */
  isConfigured(): boolean;
}
