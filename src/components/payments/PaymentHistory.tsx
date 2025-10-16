import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { supabase } from '../../integrations/supabase/client';
import { paymentService } from '../../services/paymentService';
import { demoModeService } from '../../services/demoModeService';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

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

        // If empty and consumer trip (1-12), fallback to demo data
        const tripIdNum = parseInt(tripId);
        if (paymentMessages.length === 0 && tripIdNum >= 1 && tripIdNum <= 12) {
          const mockPayments = await demoModeService.getMockPayments(tripId, false);
          paymentMessages = mockPayments.map((p: any) => ({
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

        // Fetch author names separately (no join)
        const authorIds = [...new Set(paymentMessages.map(p => p.createdBy))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', authorIds);

        const profileMap = new Map(
          (profiles || []).map(p => [p.user_id, p.display_name || 'Unknown'])
        );

        const formattedPayments = paymentMessages.map(payment => ({
          id: payment.id,
          description: payment.description,
          amount: payment.amount,
          currency: payment.currency,
          splitCount: payment.splitCount,
          createdBy: payment.createdBy,
          createdAt: payment.createdAt,
          createdByName: profileMap.get(payment.createdBy) || 'Unknown'
        }));

        setPayments(formattedPayments);
      } catch (error) {
        console.error('Error loading payment history:', error);
        
        // Final fallback for consumer trips
        const tripIdNum = parseInt(tripId);
        if (tripIdNum >= 1 && tripIdNum <= 12) {
          const mockPayments = await demoModeService.getMockPayments(tripId, false);
          const fallbackPayments = mockPayments.map((p: any) => ({
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
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          All payment requests created for this trip
        </p>
      </CardHeader>
      <CardContent>
        {payments.length > 0 ? (
          <div className="space-y-3">
            {payments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{payment.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {payment.createdByName || 'Trip member'} requested • Split among {payment.splitCount} people • {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(payment.amount / payment.splitCount, payment.currency)}/person
                  </p>
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
