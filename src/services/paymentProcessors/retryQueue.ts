/**
 * Payment Retry Queue
 * Manages retry logic for failed payments
 */

import type { PaymentRequest, PaymentResponse, PaymentError } from './types';
import { paymentProcessorFactory, ProcessorType } from './paymentProcessorFactory';

export interface QueuedPayment {
  id: string;
  processorType: ProcessorType;
  request: PaymentRequest;
  attempts: number;
  maxAttempts: number;
  lastError?: PaymentError;
  scheduledAt: Date;
  metadata?: Record<string, unknown>;
}

export class PaymentRetryQueue {
  private queue: QueuedPayment[] = [];
  private processing: Set<string> = new Set();
  private maxRetries = 3;
  private retryDelays = [1000, 5000, 30000]; // 1s, 5s, 30s

  /**
   * Add a failed payment to the retry queue
   */
  async enqueue(
    processorType: ProcessorType,
    request: PaymentRequest,
    error: PaymentError,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const paymentId = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedPayment: QueuedPayment = {
      id: paymentId,
      processorType,
      request,
      attempts: 0,
      maxAttempts: this.maxRetries,
      lastError: error,
      scheduledAt: new Date(),
      metadata
    };

    this.queue.push(queuedPayment);
    
    // Try to process immediately if retryable
    if (error.retryable) {
      this.processQueue();
    }

    return paymentId;
  }

  /**
   * Process the retry queue
   */
  private async processQueue(): Promise<void> {
    const now = new Date();
    const readyPayments = this.queue.filter(
      payment => 
        !this.processing.has(payment.id) &&
        payment.attempts < payment.maxAttempts &&
        payment.scheduledAt <= now
    );

    for (const payment of readyPayments) {
      this.processing.add(payment.id);
      this.retryPayment(payment).finally(() => {
        this.processing.delete(payment.id);
      });
    }
  }

  /**
   * Retry a payment
   */
  private async retryPayment(payment: QueuedPayment): Promise<void> {
    payment.attempts++;

    try {
      const response = await paymentProcessorFactory.processPayment(
        payment.processorType,
        payment.request
      );

      if (response.success) {
        // Success - remove from queue
        this.removeFromQueue(payment.id);
        this.onPaymentSuccess(payment, response);
      } else if (response.error && response.error.retryable && payment.attempts < payment.maxAttempts) {
        // Retry again
        payment.lastError = response.error;
        payment.scheduledAt = new Date(Date.now() + this.getRetryDelay(payment.attempts));
        this.onPaymentRetry(payment, response.error);
      } else {
        // Failed permanently
        this.removeFromQueue(payment.id);
        this.onPaymentFailed(payment, response.error);
      }
    } catch (error) {
      // Network or unexpected error
      if (payment.attempts < payment.maxAttempts) {
        payment.lastError = {
          code: 'RETRY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'network_error',
          retryable: true
        };
        payment.scheduledAt = new Date(Date.now() + this.getRetryDelay(payment.attempts));
        this.onPaymentRetry(payment, payment.lastError);
      } else {
        this.removeFromQueue(payment.id);
        this.onPaymentFailed(payment, {
          code: 'MAX_RETRIES_EXCEEDED',
          message: 'Maximum retry attempts exceeded',
          type: 'unknown',
          retryable: false
        });
      }
    }
  }

  /**
   * Get retry delay based on attempt number
   */
  private getRetryDelay(attempt: number): number {
    const index = Math.min(attempt - 1, this.retryDelays.length - 1);
    return this.retryDelays[index];
  }

  /**
   * Remove payment from queue
   */
  private removeFromQueue(paymentId: string): void {
    this.queue = this.queue.filter(p => p.id !== paymentId);
  }

  /**
   * Callback for successful payment retry
   */
  private onPaymentSuccess(payment: QueuedPayment, response: PaymentResponse): void {
    // In production, emit event or call callback
  }

  /**
   * Callback for payment retry attempt
   */
  private onPaymentRetry(payment: QueuedPayment, error: PaymentError): void {
    // In production, emit event or call callback
  }

  /**
   * Callback for permanently failed payment
   */
  private onPaymentFailed(payment: QueuedPayment, error: PaymentError): void {
    console.error(`Payment retry failed permanently: ${payment.id}`, {
      attempts: payment.attempts,
      error
    });
    // In production, emit event or call callback
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    total: number;
    processing: number;
    pending: number;
  } {
    return {
      total: this.queue.length,
      processing: this.processing.size,
      pending: this.queue.length - this.processing.size
    };
  }

  /**
   * Clear queue (for testing)
   */
  clear(): void {
    this.queue = [];
    this.processing.clear();
  }
}

export const paymentRetryQueue = new PaymentRetryQueue();
