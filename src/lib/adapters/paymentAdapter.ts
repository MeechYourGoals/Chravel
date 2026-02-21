/**
 * Payment adapter: converts between Supabase DB rows and app-level types.
 *
 * DB table: trip_payment_messages (snake_case, Json fields)
 * App type: PaymentMessage (camelCase, typed arrays)
 */

import type { Database } from '../../integrations/supabase/types';
import type { PaymentMessage } from '../../types/payments';

type PaymentRow = Database['public']['Tables']['trip_payment_messages']['Row'];

/**
 * Converts a Supabase trip_payment_messages row to an app-level PaymentMessage.
 *
 * Handles:
 * - snake_case -> camelCase field renaming
 * - Json -> string[] coercion for split_participants and payment_methods
 * - Nullable is_settled -> nullable boolean (preserves null)
 */
export function toAppPayment(row: PaymentRow): PaymentMessage {
  return {
    id: row.id,
    tripId: row.trip_id,
    messageId: row.message_id,
    amount: row.amount,
    currency: row.currency,
    description: row.description,
    splitCount: row.split_count,
    splitParticipants: Array.isArray(row.split_participants)
      ? (row.split_participants as string[])
      : [],
    paymentMethods: Array.isArray(row.payment_methods)
      ? (row.payment_methods as string[])
      : [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    isSettled: row.is_settled ?? false,
  };
}

/**
 * Converts app-level payment data to a DB-compatible insert/update payload.
 */
export function toDbPaymentInsert(
  tripId: string,
  createdBy: string,
  data: {
    amount: number;
    currency?: string;
    description: string;
    splitCount: number;
    splitParticipants?: string[];
    paymentMethods?: string[];
  },
): Database['public']['Tables']['trip_payment_messages']['Insert'] {
  return {
    trip_id: tripId,
    created_by: createdBy,
    amount: data.amount,
    currency: data.currency ?? 'USD',
    description: data.description,
    split_count: data.splitCount,
    split_participants: (data.splitParticipants ?? []) as unknown as Database['public']['Tables']['trip_payment_messages']['Insert']['split_participants'],
    payment_methods: (data.paymentMethods ?? []) as unknown as Database['public']['Tables']['trip_payment_messages']['Insert']['payment_methods'],
  };
}
