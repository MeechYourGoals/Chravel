/**
 * Stripe Payment Processor
 * Adapter for Stripe payment processing
 */

import type { PaymentProcessor, PaymentRequest, PaymentResponse, PaymentError } from './types';

// Note: Stripe.js is loaded via script tag in index.html
// This adapter provides a clean interface for Stripe payments

export class StripeProcessor implements PaymentProcessor {
  private config: {
    publishableKey?: string;
    environment: 'sandbox' | 'production';
  };

  constructor(config: { publishableKey?: string; environment?: 'sandbox' | 'production' }) {
    this.config = {
      publishableKey: config.publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
      environment: config.environment || (import.meta.env.PROD ? 'production' : 'sandbox')
    };
  }

  getName(): string {
    return 'Stripe';
  }

  isConfigured(): boolean {
    // Only check for publishable key - secret key is handled server-side
    return !!this.config.publishableKey;
  }

  async validatePaymentMethod(identifier: string): Promise<boolean> {
    // Stripe validation would check card details
    // For now, basic format validation
    if (!identifier || identifier.length < 10) {
      return false;
    }
    return true;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Stripe is not configured',
          type: 'invalid_request',
          retryable: false
        }
      };
    }

    try {
      // In production, this would call your backend API endpoint
      // which then calls Stripe's API with the secret key
      // For MVP, we'll simulate the flow
      
      const response = await fetch('/api/payments/stripe/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(request.amount * 100), // Convert to cents
          currency: request.currency.toLowerCase(),
          description: request.description,
          recipientId: request.recipientId,
          metadata: request.metadata
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        return {
          success: false,
          error: this.mapStripeError(errorData)
        };
      }

      const data = await response.json();

      return {
        success: true,
        transactionId: data.id || data.transactionId,
        metadata: data.metadata
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred',
          type: 'network_error',
          retryable: true,
          details: { originalError: String(error) }
        }
      };
    }
  }

  private mapStripeError(errorData: any): PaymentError {
    const stripeErrorCode = errorData.code || errorData.type || 'unknown';
    
    // Map Stripe error codes to our error types
    const errorMap: Record<string, PaymentError['type']> = {
      'card_declined': 'payment_method_failed',
      'insufficient_funds': 'insufficient_funds',
      'expired_card': 'payment_method_failed',
      'incorrect_cvc': 'payment_method_failed',
      'processing_error': 'network_error',
      'rate_limit': 'rate_limit'
    };

    const errorType = errorMap[stripeErrorCode] || 'unknown';
    const retryable = ['network_error', 'rate_limit'].includes(errorType);

    return {
      code: stripeErrorCode,
      message: errorData.message || 'Payment processing failed',
      type: errorType,
      retryable,
      details: errorData
    };
  }
}
