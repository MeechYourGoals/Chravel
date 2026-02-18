import React, { useState } from 'react';
import { DollarSign, Users, CreditCard, Clock, Check } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { PaymentMessage as PaymentMessageType, PaymentMethod } from '../../types/payments';
import { formatCurrency } from '../../services/currencyService';
import { getPaymentMethodDisplayName } from '../../utils/paymentDeeplinks';

interface PaymentMessageProps {
  payment: PaymentMessageType;
  currentUserId: string;
  tripMembers: Array<{ id: string; name: string; avatar?: string }>;
  userPaymentMethods: PaymentMethod[];
  onSettlePayment?: (paymentId: string, method: string) => void;
}

export const PaymentMessage = ({ 
  payment, 
  currentUserId, 
  tripMembers, 
  userPaymentMethods,
  onSettlePayment 
}: PaymentMessageProps) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const isPaidByCurrentUser = payment.createdBy === currentUserId;
  const amountPerPerson = payment.amount / payment.splitCount;
  const payer = tripMembers.find(member => member.id === payment.createdBy);
  
  // Remove icon function - we'll just use text labels

  const getPrimaryPaymentMethod = (methods: string[]): string => {
    // Order of preference: venmo, cashapp, zelle, paypal, applecash
    const priority = ['venmo', 'cashapp', 'zelle', 'paypal', 'applecash'];
    return methods.find(m => priority.includes(m.split(':')[0])) || methods[0] || 'venmo';
  };

  const getPaymentIdentifier = (method: string, payerName: string) => {
    // Mock payment identifiers for demo purposes
    const identifiers: Record<string, string> = {
      venmo: `@${payerName?.toLowerCase().replace(/\s+/g, '')}`,
      zelle: '(555) 123-4567',
      paypal: `@${payerName?.toLowerCase().replace(/\s+/g, '')}.music`,
      cashapp: `$${payerName?.toLowerCase().replace(/\s+/g, '')}`,
      applepay: payerName || 'Apple Pay',
      cash: 'In person',
      other: payerName || 'Contact directly'
    };
    return identifiers[method] || payerName;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const primaryPaymentMethod = getPrimaryPaymentMethod(payment.paymentMethods);
  const perPersonAmount = amountPerPerson.toFixed(2);

  return (
    <div className="space-y-2">
      {/* Payment Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-payment-primary text-payment-primary-foreground text-xs">
          💳 PAYMENT
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatTime(payment.createdAt)}
        </span>
      </div>

      {/* Main Payment Message - Green text for payment content */}
      <div className="text-payment-content">
        <span className="font-medium">
          {payment.description} - {payment.currency} {payment.amount.toFixed(2)} (split {payment.splitCount} ways) • Pay me ${perPersonAmount} via {getPaymentMethodDisplayName(primaryPaymentMethod)}: {getPaymentIdentifier(primaryPaymentMethod, payer?.name || 'Unknown')}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 items-center">
        {!isPaidByCurrentUser && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              const preferredMethod = userPaymentMethods.find(m => m.isPreferred)?.type || primaryPaymentMethod;
              onSettlePayment?.(payment.id, preferredMethod);
            }}
          >
            <Check size={12} className="mr-1" />
            Mark Paid
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-muted-foreground"
        >
          {showDetails ? 'Hide Details' : 'Details'}
        </Button>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className="mt-3 p-3 border border-border rounded-lg bg-muted/50 space-y-3">
          {/* Split Breakdown */}
          <div>
            <h5 className="font-medium text-sm mb-2">Split breakdown:</h5>
            <div className="space-y-1">
              {payment.splitParticipants.map(participantId => {
                const participant = tripMembers.find(m => m.id === participantId);
                const isCurrentUser = participantId === currentUserId;
                const isPayer = participantId === payment.createdBy;
                
                return (
                  <div key={participantId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {participant?.avatar && (
                        <img 
                          src={participant.avatar} 
                          alt={participant.name}
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      <span className={isCurrentUser ? 'font-medium' : ''}>
                        {isCurrentUser ? 'You' : participant?.name || 'Unknown'}
                        {isPayer && ' (paid)'}
                      </span>
                    </div>
                    <span className={isPayer ? 'text-payment-primary' : 'text-orange-600'}>
                      {isPayer ? '+' : '-'}{formatCurrency(amountPerPerson, payment.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Options */}
          {!isPaidByCurrentUser && payment.paymentMethods.length > 1 && (
            <div>
              <h5 className="font-medium text-sm mb-2">Other payment options:</h5>
              <div className="space-y-1">
                {payment.paymentMethods.slice(1).map(method => (
                  <div key={method} className="text-sm text-muted-foreground">
                    {getPaymentMethodName(method)}: {getPaymentIdentifier(method, payer?.name || 'Unknown')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};