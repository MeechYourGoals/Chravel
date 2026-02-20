/**
 * Payment cache utilities for optimistic updates
 *
 * Ensures new payments appear immediately across desktop, mobile, PWA.
 * Handles both cache shapes: PaymentMessage[] (usePayments) and
 * { payments, balanceSummary } (MobileTripPayments).
 */

import type { QueryClient } from '@tanstack/react-query';
import type { PaymentMessage } from '@/types/payments';
import { tripKeys } from '@/lib/queryKeys';

/**
 * Add a new payment to the cache immediately (optimistic update).
 * Works with both usePayments (array) and MobileTripPayments (object) cache shapes.
 */
export function optimisticallyAddPayment(
  queryClient: QueryClient,
  tripId: string,
  newPayment: PaymentMessage,
): void {
  queryClient.setQueryData(tripKeys.payments(tripId), (old: unknown) => {
    if (Array.isArray(old)) {
      return [newPayment, ...old];
    }
    if (old && typeof old === 'object' && 'payments' in old) {
      const o = old as { payments: PaymentMessage[]; balanceSummary?: unknown };
      return {
        ...o,
        payments: [newPayment, ...(o.payments || [])],
      };
    }
    return old;
  });
}

/**
 * Build a PaymentMessage from createPaymentMessage result + form data
 */
export function buildPaymentMessage(
  paymentId: string,
  tripId: string,
  userId: string,
  paymentData: {
    amount: number;
    currency: string;
    description: string;
    splitCount: number;
    splitParticipants: string[];
    paymentMethods: string[];
  },
): PaymentMessage {
  const now = new Date().toISOString();
  return {
    id: paymentId,
    tripId,
    messageId: null,
    amount: paymentData.amount,
    currency: paymentData.currency,
    description: paymentData.description,
    splitCount: paymentData.splitCount,
    splitParticipants: paymentData.splitParticipants,
    paymentMethods: paymentData.paymentMethods,
    createdBy: userId,
    createdAt: now,
    isSettled: false,
  };
}
