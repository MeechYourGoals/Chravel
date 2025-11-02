import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ChevronDown, ChevronUp, ExternalLink, Clock } from 'lucide-react';
import { PersonalBalance } from '../../services/paymentBalanceService';
import { SettlePaymentDialog } from './SettlePaymentDialog';
import { ConfirmPaymentDialog } from './ConfirmPaymentDialog';

interface PersonBalanceCardProps {
  balance: PersonalBalance;
  tripId: string;
}

export const PersonBalanceCard = ({ balance, tripId }: PersonBalanceCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const isPendingConfirmation = balance.confirmationStatus === 'pending';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

  const youOweThem = balance.amountOwed < 0;
  const amount = Math.abs(balance.amountOwed);

  const getPaymentMethodDisplay = () => {
    if (!balance.preferredPaymentMethod) return 'No payment method set';
    
    const method = balance.preferredPaymentMethod;
    const typeNames: Record<string, string> = {
      venmo: 'Venmo',
      cashapp: 'Cash App',
      zelle: 'Zelle',
      paypal: 'PayPal',
      applecash: 'Apple Cash'
    };

    return `${typeNames[method.type] || method.type}: ${method.identifier}`;
  };

  const getPaymentLink = () => {
    if (!balance.preferredPaymentMethod) return null;
    
    const method = balance.preferredPaymentMethod;
    const identifier = method.identifier;
    
    switch (method.type) {
      case 'venmo':
        return `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(identifier)}&amount=${amount.toFixed(2)}`;
      case 'cashapp':
        return `https://cash.app/${encodeURIComponent(identifier)}/${amount.toFixed(2)}`;
      case 'paypal':
        return `https://paypal.me/${encodeURIComponent(identifier)}/${amount.toFixed(2)}`;
      case 'zelle':
        return null; // Zelle doesn't have direct deeplinks
      case 'applecash':
        return null; // Apple Cash handled through iMessage
      default:
        return null;
    }
  };

  const paymentLink = getPaymentLink();

  return (
    <>
      <Card className={`${youOweThem ? 'border-orange-600/30' : 'border-green-600/30'} rounded-lg`}>
        <CardContent className="py-3 px-4">
          {/* Single row layout with all info inline */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: User Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={balance.avatar} alt={balance.userName} />
                <AvatarFallback>{balance.userName.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="min-w-0">
                <h4 className="font-semibold text-foreground truncate">{balance.userName}</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {getPaymentMethodDisplay()}
                </p>
              </div>
            </div>

            {/* Middle: Action Button */}
            {isPendingConfirmation && !youOweThem ? (
              <Button 
                size="sm" 
                className="text-xs px-2 py-1 h-auto flex-shrink-0 bg-orange-600 hover:bg-orange-700"
                onClick={() => setShowConfirmDialog(true)}
              >
                <Clock className="w-3 h-3 mr-1" />
                Confirm Payment
              </Button>
            ) : youOweThem ? (
              <div className="flex gap-2 flex-shrink-0">
                {paymentLink && (
                  <Button 
                    size="sm" 
                    className="text-xs px-2 py-1 h-auto"
                    onClick={() => window.open(paymentLink, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Pay Now
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-xs px-2 py-1 h-auto"
                  onClick={() => setShowSettleDialog(true)}
                >
                  Mark as Paid
                </Button>
              </div>
            ) : (
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs px-2 py-1 h-auto flex-shrink-0"
                onClick={() => setShowSettleDialog(true)}
              >
                Mark as Paid
              </Button>
            )}

            {/* Right: Amount */}
            <div className="text-right flex-shrink-0">
              <p className={`text-sm font-semibold ${youOweThem ? 'text-orange-600' : 'text-green-600'}`}>
                {youOweThem ? 'You owe' : 'Owes you'}
              </p>
              <p className="text-lg font-bold">{formatCurrency(amount)}</p>
            </div>
            
            {/* Chevron toggle */}
            <Button 
              size="sm" 
              variant="ghost"
              className="flex-shrink-0 h-auto p-1"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {/* Details Section */}
          {showDetails && (
            <div className="mt-3 pt-3 border-t border-border space-y-1.5">
              <h5 className="font-medium text-sm text-muted-foreground mb-2">
                Individual Payments
              </h5>
              {balance.unsettledPayments.length > 0 ? (
                balance.unsettledPayments.map((payment, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{payment.description}</span>
                    <span className={payment.amount < 0 ? 'text-orange-600' : 'text-green-600'}>
                      {formatCurrency(Math.abs(payment.amount))}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No itemized breakdown available
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <SettlePaymentDialog
        open={showSettleDialog}
        onOpenChange={setShowSettleDialog}
        balance={balance}
        tripId={tripId}
      />

      <ConfirmPaymentDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        balance={balance}
        tripId={tripId}
      />
    </>
  );
};
