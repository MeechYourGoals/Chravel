/**
 * Payment Processor Factory
 * Creates and manages payment processor instances
 */

import { StripeProcessor } from './stripeProcessor';
import { VenmoProcessor } from './venmoProcessor';
import type { PaymentProcessor, PaymentRequest, PaymentResponse } from './types';

export type ProcessorType = 'stripe' | 'venmo' | 'zelle' | 'cashapp' | 'paypal' | 'applecash';

class PaymentProcessorFactory {
  private processors: Map<ProcessorType, PaymentProcessor> = new Map();

  constructor() {
    // Initialize processors
    this.processors.set('stripe', new StripeProcessor({}));
    this.processors.set('venmo', new VenmoProcessor({}));
    // Add other processors as needed
  }

  /**
   * Get a payment processor by type
   */
  getProcessor(type: ProcessorType): PaymentProcessor | null {
    return this.processors.get(type) || null;
  }

  /**
   * Process payment with the appropriate processor
   */
  async processPayment(
    type: ProcessorType,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    const processor = this.getProcessor(type);

    if (!processor) {
      return {
        success: false,
        error: {
          code: 'PROCESSOR_NOT_FOUND',
          message: `Payment processor '${type}' is not available`,
          type: 'invalid_request',
          retryable: false
        }
      };
    }

    if (!processor.isConfigured()) {
      return {
        success: false,
        error: {
          code: 'PROCESSOR_NOT_CONFIGURED',
          message: `Payment processor '${type}' is not configured`,
          type: 'invalid_request',
          retryable: false
        }
      };
    }

    return processor.processPayment(request);
  }

  /**
   * Validate payment method identifier
   */
  async validatePaymentMethod(
    type: ProcessorType,
    identifier: string
  ): Promise<boolean> {
    const processor = this.getProcessor(type);
    if (!processor) {
      return false;
    }

    return processor.validatePaymentMethod(identifier);
  }

  /**
   * Get all available processors
   */
  getAvailableProcessors(): ProcessorType[] {
    return Array.from(this.processors.keys());
  }
}

export const paymentProcessorFactory = new PaymentProcessorFactory();
