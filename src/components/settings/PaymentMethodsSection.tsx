/**
 * Payment Methods Section
 * Manage user payment methods (Venmo, Cash App, Zelle, PayPal, Apple Cash)
 */
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePayments } from '@/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

type PaymentMethodType = 'venmo' | 'cashapp' | 'zelle' | 'paypal' | 'applecash';
const PAYMENT_METHOD_TYPES: PaymentMethodType[] = [
  'venmo',
  'cashapp',
  'zelle',
  'paypal',
  'applecash',
];

export const PaymentMethodsSection: React.FC = () => {
  const { user } = useAuth();
  const { paymentMethods, addPaymentMethod, deletePaymentMethod } = usePayments();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newMethod, setNewMethod] = useState<PaymentMethodType>('venmo');
  const [newHandle, setNewHandle] = useState('');

  const handleAdd = async () => {
    if (!newHandle.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a username/handle',
        variant: 'destructive',
      });
      return;
    }

    const success = await addPaymentMethod({
      type: newMethod,
      identifier: newHandle.trim(),
      display_name: newMethod.charAt(0).toUpperCase() + newMethod.slice(1),
      is_preferred: paymentMethods.length === 0,
    });

    if (success) {
      toast({ title: 'Success', description: 'Payment method added' });
      setNewHandle('');
      setIsAdding(false);
    }
  };

  const handleDelete = async (methodId: string) => {
    const success = await deletePaymentMethod(methodId);
    if (success) {
      toast({ title: 'Success', description: 'Payment method removed' });
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Payment Methods</h3>
            <p className="text-sm text-muted-foreground">
              Manage your payment accounts for quick transfers
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Method
          </Button>
        </div>

        {isAdding && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={newMethod} onValueChange={v => setNewMethod(v as PaymentMethodType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_TYPES.map(method => (
                    <SelectItem key={method} value={method}>
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Username/Handle</Label>
              <Input
                value={newHandle}
                onChange={e => setNewHandle(e.target.value)}
                placeholder="@username"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd}>Add</Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {paymentMethods.map(method => (
            <div
              key={method.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <p className="font-medium">
                  {method.display_name || method.displayName || 'Payment Method'}
                </p>
                <p className="text-sm text-muted-foreground">{method.identifier}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(method.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {paymentMethods.length === 0 && !isAdding && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No payment methods added yet
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
