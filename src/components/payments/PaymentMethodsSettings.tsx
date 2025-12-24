import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CreditCard, Smartphone, DollarSign, Mail, Phone, Loader2 } from 'lucide-react';
import { PaymentMethod } from '../../types/payments';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { paymentService } from '../../services/paymentService';
import { useToast } from '../../hooks/use-toast';
import { maskPaymentIdentifier } from '@/utils/paymentIdentifierMasking';

interface PaymentMethodsSettingsProps {
  userId: string;
}

export const PaymentMethodsSettings = ({ userId }: PaymentMethodsSettingsProps) => {
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

  // Load payment methods from database
  useEffect(() => {
    const loadPaymentMethods = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const methods = await paymentService.getUserPaymentMethods(userId);
        setPaymentMethods(methods);
      } catch (error) {
        console.error('Error loading payment methods:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPaymentMethods();
  }, [userId]);

  const [formData, setFormData] = useState({
    type: 'venmo' as PaymentMethod['type'],
    identifier: '',
    displayName: '',
    isPreferred: false,
    isVisible: true
  });

  const paymentMethodOptions = [
    { value: 'venmo', label: 'Venmo', icon: Smartphone, placeholder: '@username' },
    { value: 'zelle', label: 'Zelle', icon: Mail, placeholder: 'email@example.com or phone' },
    { value: 'cashapp', label: 'Cash App', icon: DollarSign, placeholder: '$cashtag' },
    { value: 'applepay', label: 'Apple Pay', icon: Phone, placeholder: 'phone number' },
    { value: 'paypal', label: 'PayPal', icon: Mail, placeholder: 'email@example.com' },
    { value: 'applecash', label: 'Apple Cash', icon: Phone, placeholder: 'phone number' },
    { value: 'cash', label: 'Cash', icon: DollarSign, placeholder: 'Prefer cash payments' },
    { value: 'other', label: 'Other', icon: CreditCard, placeholder: 'Custom payment method' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    setIsSaving(true);
    try {
      const methodData = {
        ...formData,
        displayName: formData.displayName || getDefaultDisplayName(formData.type)
      };

      if (editingMethod?.id) {
        // Update existing method
        const success = await paymentService.updatePaymentMethod(editingMethod.id, methodData);
        if (success) {
          setPaymentMethods(prev => prev.map(method => 
            method.id === editingMethod.id ? { ...method, ...methodData } : method
          ));
          toast({ title: 'Payment method updated', description: 'Your changes have been saved.' });
        } else {
          throw new Error('Failed to update');
        }
      } else {
        // Add new method
        const success = await paymentService.savePaymentMethod(userId, methodData);
        if (success) {
          // Reload from database to get the new ID
          const methods = await paymentService.getUserPaymentMethods(userId);
          setPaymentMethods(methods);
          toast({ title: 'Payment method added', description: 'Your new payment method has been saved.' });
        } else {
          throw new Error('Failed to save');
        }
      }
      resetForm();
    } catch (error) {
      console.error('Error saving payment method:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to save payment method. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'venmo',
      identifier: '',
      displayName: '',
      isPreferred: false,
      isVisible: true
    });
    setShowAddForm(false);
    setEditingMethod(null);
  };

  const handleEdit = (method: PaymentMethod) => {
    setFormData({
      type: method.type,
      identifier: method.identifier,
      displayName: method.displayName || '',
      isPreferred: method.isPreferred || false,
      isVisible: method.isVisible !== false
    });
    setEditingMethod(method);
    setShowAddForm(true);
  };

  const handleDelete = async (methodId: string) => {
    try {
      const success = await paymentService.deletePaymentMethod(methodId);
      if (success) {
        setPaymentMethods(prev => prev.filter(method => method.id !== methodId));
        toast({ title: 'Payment method removed', description: 'The payment method has been deleted.' });
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to delete payment method. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getDefaultDisplayName = (type: PaymentMethod['type']): string => {
    const option = paymentMethodOptions.find(opt => opt.value === type);
    return option?.label || type;
  };

  const getMethodIcon = (type: PaymentMethod['type']) => {
    const option = paymentMethodOptions.find(opt => opt.value === type);
    const Icon = option?.icon || CreditCard;
    return <Icon size={20} />;
  };

  const getPlaceholder = (type: PaymentMethod['type']): string => {
    const option = paymentMethodOptions.find(opt => opt.value === type);
    return option?.placeholder || 'Enter identifier';
  };

  return (
    <Card className="bg-background border-muted">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard size={20} className="text-primary" />
          Payment Methods
        </CardTitle>
        <CardDescription>
          Manage how you want to receive payments from trip members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading payment methods...</span>
          </div>
        ) : (
        <>
        {/* Add/Edit Form */}
        {showAddForm && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">
                {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Payment Method</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as PaymentMethod['type'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethodOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <option.icon size={16} />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="identifier">Identifier</Label>
                    <Input
                      id="identifier"
                      value={formData.identifier}
                      onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                      placeholder={getPlaceholder(formData.type)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="displayName">Display Name (Optional)</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder={`Custom name for ${formData.type}`}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="preferred"
                      checked={formData.isPreferred}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPreferred: checked }))}
                    />
                    <Label htmlFor="preferred">Set as preferred method</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="visible"
                      checked={formData.isVisible}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isVisible: checked }))}
                    />
                    <Label htmlFor="visible">Visible to trip members</Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="bg-primary" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingMethod ? 'Update Method' : 'Add Method'
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Payment Methods List */}
        <div className="space-y-3">
          {paymentMethods.map(method => (
            <Card key={method.id} className="bg-background border-muted">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-primary">
                      {getMethodIcon(method.type)}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {method.displayName || getDefaultDisplayName(method.type)}
                        {method.isPreferred && (
                          <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                            Preferred
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {maskPaymentIdentifier(method.identifier, method.type)}
                        {!method.isVisible && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Private)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEdit(method)}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDelete(method.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {paymentMethods.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard size={48} className="mx-auto mb-4 text-muted-foreground/50" />
            <p className="mb-4">No payment methods added yet</p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus size={16} className="mr-2" />
              Add Your First Payment Method
            </Button>
          </div>
        )}

        {!showAddForm && paymentMethods.length > 0 && (
          <Button onClick={() => setShowAddForm(true)} className="w-full">
            <Plus size={16} className="mr-2" />
            Add Payment Method
          </Button>
        )}
        </>
        )}
      </CardContent>
    </Card>
  );
};