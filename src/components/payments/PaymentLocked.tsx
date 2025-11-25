import { Lock, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';

interface PaymentLockedProps {
  className?: string;
}

export const PaymentLocked = ({ className = '' }: PaymentLockedProps) => {
  const { upgradeToTier } = useConsumerSubscription();

  return (
    <Card className={`p-6 text-center space-y-4 border-2 border-dashed border-muted ${className}`}>
      <div className="flex justify-center">
        <div className="rounded-full bg-primary/10 p-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          Split Expenses with Friends
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Create payment requests, track who owes what, and settle up seamlessly with Explorer or Frequent Chraveler plans.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
        <Button 
          onClick={() => upgradeToTier('explorer', 'monthly')}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Upgrade to Explorer - $9.99/mo
        </Button>
        <Button 
          onClick={() => upgradeToTier('frequent-chraveler', 'monthly')}
          variant="outline"
          className="gap-2"
        >
          Frequent Chraveler - $19.99/mo
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        You can view existing payments but need to upgrade to create new ones
      </p>
    </Card>
  );
};
