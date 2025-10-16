import React from 'react';
import { Card, CardContent } from '../ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BalanceSummary as BalanceSummaryType } from '../../services/paymentBalanceService';

interface BalanceSummaryProps {
  summary: BalanceSummaryType;
}

export const BalanceSummary = ({ summary }: BalanceSummaryProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getNetBalanceColor = () => {
    if (summary.netBalance > 0) return 'text-green-600';
    if (summary.netBalance < 0) return 'text-orange-600';
    return 'text-muted-foreground';
  };

  const getNetBalanceIcon = () => {
    if (summary.netBalance > 0) return <TrendingUp className="w-5 h-5" />;
    if (summary.netBalance < 0) return <TrendingDown className="w-5 h-5" />;
    return <Minus className="w-5 h-5" />;
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* You Owe */}
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">You Owe</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.totalOwed)}
            </p>
          </div>

          {/* You Are Owed */}
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">You Are Owed</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalOwedToYou)}
            </p>
          </div>

          {/* Net Balance */}
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Net Balance</p>
            <div className={`flex items-center justify-center gap-2 text-2xl font-bold ${getNetBalanceColor()}`}>
              {getNetBalanceIcon()}
              {formatCurrency(Math.abs(summary.netBalance))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
