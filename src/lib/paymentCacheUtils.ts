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

export function optimisticallyUpdatePayment(
  queryClient: QueryClient,
  tripId: string,
  paymentId: string,
  updates: Partial<Pick<PaymentMessage, 'amount' | 'description' | 'isSettled'>>,
): void {
  queryClient.setQueryData(tripKeys.payments(tripId), (old: unknown) => {
    const updateOne = (p: PaymentMessage): PaymentMessage =>
      p.id === paymentId ? { ...p, ...updates } : p;

    if (Array.isArray(old)) {
      return old.map(updateOne);
    }
    if (old && typeof old === 'object' && 'payments' in old) {
      const o = old as { payments: PaymentMessage[]; balanceSummary?: unknown };
      return { ...o, payments: (o.payments || []).map(updateOne) };
    }
    return old;
  });
}

export function optimisticallyRemovePayment(
  queryClient: QueryClient,
  tripId: string,
  paymentId: string,
): void {
  queryClient.setQueryData(tripKeys.payments(tripId), (old: unknown) => {
    const without = (arr: PaymentMessage[]): PaymentMessage[] =>
      arr.filter(p => p.id !== paymentId);

    if (Array.isArray(old)) {
      return without(old);
    }
    if (old && typeof old === 'object' && 'payments' in old) {
      const o = old as { payments: PaymentMessage[]; balanceSummary?: unknown };
      return { ...o, payments: without(o.payments || []) };
    }
    return old;
  });
}

export function replaceOptimisticPaymentId(
  queryClient: QueryClient,
  tripId: string,
  optimisticId: string,
  realId: string,
): void {
  queryClient.setQueryData(tripKeys.payments(tripId), (old: unknown) => {
    const replaceIn = (arr: PaymentMessage[]): PaymentMessage[] => {
      let didReplace = false;
      const next = arr
        .filter(p => p.id !== realId) // de-dupe if realtime/refetch already inserted it
        .map(p => {
          if (p.id !== optimisticId) return p;
          didReplace = true;
          return { ...p, id: realId };
        });

      return didReplace ? next : arr;
    };

    if (Array.isArray(old)) {
      return replaceIn(old);
    }
    if (old && typeof old === 'object' && 'payments' in old) {
      const o = old as { payments: PaymentMessage[]; balanceSummary?: unknown };
      return { ...o, payments: replaceIn(o.payments || []) };
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
