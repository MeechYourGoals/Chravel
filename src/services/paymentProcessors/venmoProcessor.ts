/**
 * Venmo Payment Processor
 * Adapter for Venmo payment processing (via API or deeplink)
 */

import type { PaymentProcessor, PaymentRequest, PaymentResponse, PaymentError } from './types';

export class VenmoProcessor implements PaymentProcessor {
  private config: {
    clientId?: string;
    environment: 'sandbox' | 'production';
  };

  constructor(config: { clientId?: string; environment?: 'sandbox' | 'production' }) {
    this.config = {
      clientId: config.clientId || import.meta.env.VITE_VENMO_CLIENT_ID,
      environment: config.environment || (import.meta.env.PROD ? 'production' : 'sandbox')
    };
  }

  getName(): string {
    return 'Venmo';
  }

  isConfigured(): boolean {
    // Venmo can work via deeplinks even without API keys
    return true;
  }

  async validatePaymentMethod(identifier: string): Promise<boolean> {
    // Venmo username validation (alphanumeric, 5-16 chars)
    if (!identifier || identifier.length < 5 || identifier.length > 16) {
      return false;
    }
    return /^[a-zA-Z0-9]+$/.test(identifier);
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Venmo payments are typically handled via deeplinks or OAuth
      // For MVP, we'll generate a Venmo deeplink
      const venmoUrl = this.generateVenmoDeeplink(request);

      return {
        success: true,
        transactionId: `venmo_${Date.now()}`,
        metadata: {
          venmoUrl,
          method: 'deeplink',
          note: 'User will complete payment in Venmo app'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VENMO_ERROR',
          message: error instanceof Error ? error.message : 'Venmo payment failed',
          type: 'unknown',
          retryable: true,
          details: { originalError: String(error) }
        }
      };
    }
  }

  private generateVenmoDeeplink(request: PaymentRequest): string {
    // Venmo deeplink format: venmo://paycharge?txn=pay&recipients=USERNAME&amount=AMOUNT&note=NOTE
    const amount = request.amount.toFixed(2);
    const note = encodeURIComponent(request.description);
    const recipient = encodeURIComponent(request.recipientIdentifier);

    return `venmo://paycharge?txn=pay&recipients=${recipient}&amount=${amount}&note=${note}`;
  }
}
