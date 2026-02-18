import { useState, useCallback, useEffect } from 'react';

export interface TripMember {
  id: string;
  name: string;
  avatar?: string;
}

export type PaymentMethodType = 'venmo' | 'cashapp' | 'zelle' | 'paypal' | 'applecash';

export interface PaymentSplitData {
  amount: number;
  currency: string;
  description: string;
  splitCount: number;
  splitParticipants: string[];
  paymentMethods: PaymentMethodType[];
}

import { PAYMENT_METHOD_OPTIONS } from '@/types/paymentMethods';

export const SUPPORTED_PAYMENT_METHODS: PaymentMethodType[] = PAYMENT_METHOD_OPTIONS.map(
  (o) => o.id
);

export const usePaymentSplits = (tripMembers: TripMember[] = []) => {
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<PaymentMethodType[]>([]);
  const [splitCount, setSplitCount] = useState(0);

  // Update split count when participants change
  useEffect(() => {
    setSplitCount(selectedParticipants.length);
  }, [selectedParticipants]);

  const toggleParticipant = useCallback((participantId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  }, []);

  const togglePaymentMethod = useCallback((method: PaymentMethodType) => {
    setSelectedPaymentMethods(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  }, []);

  const selectAllParticipants = useCallback(() => {
    const allSelected = selectedParticipants.length === tripMembers.length;
    setSelectedParticipants(allSelected ? [] : tripMembers.map(m => m.id));
  }, [selectedParticipants.length, tripMembers]);

  const selectAllPaymentMethods = useCallback(() => {
    const allSelected = selectedPaymentMethods.length === SUPPORTED_PAYMENT_METHODS.length;
    setSelectedPaymentMethods(allSelected ? [] : [...SUPPORTED_PAYMENT_METHODS]);
  }, [selectedPaymentMethods.length]);

  const calculatePerPersonAmount = useCallback((): number => {
    if (splitCount === 0) return 0;
    return amount / splitCount;
  }, [amount, splitCount]);

  const validatePayment = useCallback((): { isValid: boolean; error?: string } => {
    if (amount <= 0) {
      return { isValid: false, error: 'Amount must be greater than 0' };
    }

    if (!description.trim()) {
      return { isValid: false, error: 'Description is required' };
    }

    if (selectedParticipants.length === 0) {
      return { isValid: false, error: 'At least one participant must be selected' };
    }

    if (selectedPaymentMethods.length === 0) {
      return { isValid: false, error: 'At least one payment method must be selected' };
    }

    return { isValid: true };
  }, [amount, description, selectedParticipants, selectedPaymentMethods]);

  const getPaymentData = useCallback((): PaymentSplitData | null => {
    const validation = validatePayment();
    if (!validation.isValid) {
      return null;
    }

    return {
      amount,
      currency,
      description: description.trim(),
      splitCount,
      splitParticipants: selectedParticipants,
      paymentMethods: selectedPaymentMethods
    };
  }, [amount, currency, description, splitCount, selectedParticipants, selectedPaymentMethods, validatePayment]);

  const resetForm = useCallback(() => {
    setAmount(0);
    setCurrency('USD');
    setDescription('');
    setSelectedParticipants([]);
    setSelectedPaymentMethods([]);
    setSplitCount(0);
  }, []);

  return {
    // State
    amount,
    currency,
    description,
    selectedParticipants,
    selectedPaymentMethods,
    splitCount,
    
    // Computed
    perPersonAmount: calculatePerPersonAmount(),
    isValid: validatePayment().isValid,
    validationError: validatePayment().error,
    allParticipantsSelected: selectedParticipants.length === tripMembers.length,
    allPaymentMethodsSelected: selectedPaymentMethods.length === SUPPORTED_PAYMENT_METHODS.length,
    
    // Actions
    setAmount,
    setCurrency,
    setDescription,
    setSelectedParticipants,
    toggleParticipant,
    togglePaymentMethod,
    selectAllParticipants,
    selectAllPaymentMethods,
    getPaymentData,
    validatePayment,
    resetForm
  };
};
