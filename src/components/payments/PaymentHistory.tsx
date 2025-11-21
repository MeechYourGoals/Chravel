import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { supabase } from '../../integrations/supabase/client';
import { paymentService } from '../../services/paymentService';
import { demoModeService } from '../../services/demoModeService';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface MockPayment {
  id: string;
  trip_id: string;
  amount: number;
  currency: string;
  description: string;
  split_count: number;
  split_participants: string[];
  payment_methods: string[];
  created_by: string;
  is_settled: boolean;
  created_at: string;
  updated_at: string;
  version: number;
}

interface PaymentHistoryProps {
  tripId: string;
}

interface PaymentRecord {
  id: string;
  description: string;
  amount: number;
  currency: string;
  splitCount: number;
  createdBy: string;
  createdAt: string;
  createdByName?: string;
}

export const PaymentHistory = ({ tripId }: PaymentHistoryProps) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPayments = async () => {
      setLoading(true);
      try {
        // Use paymentService to get payments
        let paymentMessages = await paymentService.getTripPaymentMessages(tripId);

        // If empty and consumer trip (1-12), fallback to demo data (now synchronous)
        const tripIdNum = parseInt(tripId);
        if (paymentMessages.length === 0 && tripIdNum >= 1 && tripIdNum <= 12) {
          const mockPayments = demoModeService.getMockPayments(tripId, false);
          paymentMessages = mockPayments.map((p: MockPayment) => ({
            id: p.id,
            tripId: p.trip_id,
            messageId: null,
            amount: p.amount,
            currency: p.currency,
            description: p.description,
            splitCount: p.split_count,
            splitParticipants: p.split_participants,
            paymentMethods: p.payment_methods,
            createdBy: p.created_by,
            createdAt: p.created_at,
            isSettled: p.is_settled
          }));
        }

        // Add session payments (demo mode only)
        const sessionPayments = demoModeService.getSessionPayments(tripId);
        if (sessionPayments.length > 0) {
          const sessionMessages = sessionPayments.map((p) => ({
            id: p.id,
            tripId: p.trip_id,
            messageId: null,
            amount: p.amount,
            currency: p.currency,
            description: p.description,
            splitCount: p.split_count,
            splitParticipants: p.split_participants,
            paymentMethods: p.payment_methods,
            createdBy: p.created_by,
            createdAt: p.created_at,
            isSettled: p.is_settled
          }));
          paymentMessages = [...paymentMessages, ...sessionMessages];
        }

        // Sort by created date (newest first)
        paymentMessages.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Fetch author names separately (no join), skip demo-user
        const authorIds = [...new Set(paymentMessages
          .filter(p => p.createdBy !== 'demo-user')
          .map(p => p.createdBy))];
        
        const profileMap = new Map<string, string>();
        
        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name')
            .in('user_id', authorIds);

          (profiles || []).forEach(p => {
            profileMap.set(p.user_id, p.display_name || 'Trip member');
          });
        }

        const formattedPayments = paymentMessages.map(payment => ({
          id: payment.id,
          description: payment.description,
          amount: payment.amount,
          currency: payment.currency,
          splitCount: payment.splitCount,
          createdBy: payment.createdBy,
          createdAt: payment.createdAt,
          createdByName: payment.createdBy === 'demo-user' 
            ? 'Demo User' 
            : profileMap.get(payment.createdBy) || 'Trip member'
        }));

        setPayments(formattedPayments);
      } catch (error) {
        console.error('Error loading payment history:', error);
        
        // Final fallback for consumer trips (now synchronous)
        const tripIdNum = parseInt(tripId);
        if (tripIdNum >= 1 && tripIdNum <= 12) {
          const mockPayments = demoModeService.getMockPayments(tripId, false);
          const fallbackPayments = mockPayments.map((p: MockPayment) => ({
            id: p.id,
            description: p.description,
            amount: p.amount,
            currency: p.currency,
            splitCount: p.split_count,
            createdBy: p.created_by,
            createdAt: p.created_at,
            createdByName: 'Demo User'
          }));
          setPayments(fallbackPayments);
        } else {
          setPayments([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, [tripId]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">Payment History</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          All payment requests created for this trip
        </p>
      </CardHeader>
      <CardContent className="py-3 px-4">
        {payments.length > 0 ? (
          <div className="space-y-1">
            {payments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                {/* Left: Title and metadata inline */}
                <div className="flex items-baseline gap-2 flex-1 min-w-0">
                  <span className="font-medium text-foreground">{payment.description}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {payment.createdByName || 'Trip member'} requested • Split among {payment.splitCount} people • {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
                {/* Right: Amount and per-person inline */}
                <div className="text-right flex-shrink-0">
                  <span className="font-semibold text-foreground">
                    {formatCurrency(payment.amount, payment.currency)}{' '}
                    <span className="text-sm text-muted-foreground font-normal">
                      ({formatCurrency(payment.amount / payment.splitCount, payment.currency)}/person)
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            No payments yet
          </p>
        )}
      </CardContent>
    </Card>
  );
};
