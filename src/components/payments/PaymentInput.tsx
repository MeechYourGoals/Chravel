import React, { useEffect, useState } from 'react';
import { DollarSign, Users, CheckSquare, Sparkles } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent } from '../ui/card';
import { usePaymentSplits } from '@/hooks/usePaymentSplits';
import { useDemoMode } from '@/hooks/useDemoMode';
import { PaymentMethodId } from '@/types/paymentMethods';
import { getAutomaticParticipantSuggestions, detectPaymentParticipantsFromMessage } from '@/services/chatAnalysisService';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '../ui/badge';
import { CurrencySelector } from './CurrencySelector';

interface PaymentInputProps {
  onSubmit: (paymentData: {
    amount: number;
    currency: string;
    description: string;
    splitCount: number;
    splitParticipants: string[];
    paymentMethods: string[];
  }) => void;
  tripMembers: Array<{ id: string; name: string; avatar?: string }>;
  isVisible: boolean;
  tripId: string;
}

export const PaymentInput = ({ onSubmit, tripMembers, isVisible, tripId }: PaymentInputProps) => {
  const { user } = useAuth();
  const {
    amount,
    currency,
    description,
    selectedParticipants,
    selectedPaymentMethods,
    perPersonAmount,
    allParticipantsSelected,
    allPaymentMethodsSelected,
    setAmount,
    setCurrency,
    setDescription,
    toggleParticipant,
    togglePaymentMethod,
    selectAllParticipants,
    selectAllPaymentMethods,
    getPaymentData,
    resetForm,
    setSelectedParticipants
  } = usePaymentSplits(tripMembers);
  
  const [autoSuggestions, setAutoSuggestions] = useState<Array<{ userId: string; reason: string; confidence: number }>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const paymentMethodOptions: Array<{ id: PaymentMethodId; label: string }> = [
    { id: 'venmo', label: 'Venmo' },
    { id: 'cashapp', label: 'Cash App' },
    { id: 'zelle', label: 'Zelle' },
    { id: 'paypal', label: 'PayPal' },
    { id: 'applecash', label: 'Apple Cash' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paymentData = getPaymentData();
    if (paymentData) {
      onSubmit(paymentData);
      resetForm();
    }
  };

  const amountPerPerson = perPersonAmount;
  const { isDemoMode } = useDemoMode();

  // Auto-detect participants when description changes
  useEffect(() => {
    if (!user?.id || !tripId || isDemoMode || !description.trim()) {
      return;
    }

    const analyzeDescription = async () => {
      setIsAnalyzing(true);
      try {
        // Try to parse payment info from description
        const result = await detectPaymentParticipantsFromMessage(
          description,
          tripId,
          user.id
        );

        if (result.suggestedParticipants.length > 0 && result.confidence > 0.5) {
          setAutoSuggestions(result.suggestedParticipants);
          
          // Auto-select high-confidence suggestions
          const highConfidenceIds = result.suggestedParticipants
            .filter(s => s.confidence >= 0.7)
            .map(s => s.userId);
          
          if (highConfidenceIds.length > 0 && selectedParticipants.length === 0) {
            setSelectedParticipants(highConfidenceIds);
          }

          // Auto-fill amount and currency if detected
          if (result.amount && !amount) {
            setAmount(result.amount);
          }
          if (result.currency && currency === 'USD') {
            setCurrency(result.currency);
          }
        } else {
          setAutoSuggestions([]);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error analyzing payment description:', error);
        }
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Debounce analysis
    const timeoutId = setTimeout(analyzeDescription, 500);
    return () => clearTimeout(timeoutId);
  }, [description, tripId, user?.id, isDemoMode, amount, currency, selectedParticipants.length, setAmount, setCurrency, setSelectedParticipants]);

  // Load automatic suggestions on mount
  useEffect(() => {
    if (!user?.id || !tripId || isDemoMode) {
      return;
    }

    const loadSuggestions = async () => {
      try {
        const suggestions = await getAutomaticParticipantSuggestions(tripId, user.id);
        setAutoSuggestions(suggestions);
        
        // Auto-select top suggestions if none selected
        if (selectedParticipants.length === 0 && suggestions.length > 0) {
          const topSuggestions = suggestions
            .filter(s => s.confidence >= 0.6)
            .slice(0, 3)
            .map(s => s.userId);
          
          if (topSuggestions.length > 0) {
            setSelectedParticipants(topSuggestions);
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error loading automatic suggestions:', error);
        }
      }
    };

    loadSuggestions();
  }, [tripId, user?.id, isDemoMode, selectedParticipants.length, setSelectedParticipants]);

  if (!isVisible) return null;

  return (
    <Card className="bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 border border-white/10 rounded-2xl shadow-2xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign size={20} className="text-emerald-400" />
          <span className="text-base font-semibold text-white">Payment Details</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount, Currency & Description - 3 Column Grid with Equal Heights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="amount" className="text-sm font-medium text-gray-300">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full h-12 rounded-xl bg-gray-900/40 border border-white/10 text-white px-4 focus:ring-2 focus:ring-emerald-400/40 focus:outline-none placeholder-gray-500 transition-all"
                required
              />
            </div>

            <div className="flex flex-col space-y-1">
              <Label htmlFor="currency" className="text-sm font-medium text-gray-300">Currency</Label>
              <CurrencySelector
                value={currency}
                onChange={setCurrency}
              />
            </div>

            <div className="flex flex-col space-y-1">
              <Label htmlFor="description" className="text-sm font-medium text-gray-300">What's this for?</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dinner, taxi, tickets, etc."
                className="w-full h-12 resize-none rounded-xl bg-gray-900/40 border border-white/10 text-white px-4 py-2 focus:ring-2 focus:ring-emerald-400/40 focus:outline-none placeholder-gray-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Split Between People - Unified Box with 2-Column Grid */}
          <div className="bg-gray-900/40 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-400" />
                <h4 className="text-sm font-semibold text-gray-200">
                  Split between {selectedParticipants.length} people
                  {amountPerPerson > 0 && (
                    <span className="text-emerald-400 font-semibold ml-1.5">
                      (${amountPerPerson.toFixed(2)} each)
                    </span>
                  )}
                </h4>
                {isAnalyzing && (
                  <Sparkles size={14} className="text-emerald-400 animate-pulse" />
                )}
              </div>
              <button
                type="button"
                onClick={selectAllParticipants}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                {allParticipantsSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            {/* Auto-suggestions badge */}
            {autoSuggestions.length > 0 && !isDemoMode && (
              <div className="mb-2 flex flex-wrap gap-1">
                {autoSuggestions.slice(0, 3).map(suggestion => {
                  const member = tripMembers.find(m => m.id === suggestion.userId);
                  if (!member) return null;
                  const isSelected = selectedParticipants.includes(suggestion.userId);
                  return (
                    <Badge
                      key={suggestion.userId}
                      variant={isSelected ? 'default' : 'outline'}
                      className="text-xs cursor-pointer hover:bg-emerald-500/20"
                      onClick={() => toggleParticipant(suggestion.userId)}
                    >
                      {member.name}
                      {suggestion.confidence >= 0.7 && (
                        <Sparkles size={10} className="ml-1" />
                      )}
                    </Badge>
                  );
                })}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 max-h-48 overflow-y-auto">
              {tripMembers.map(member => (
                <label
                  key={member.id}
                  htmlFor={`participant-${member.id}`}
                  className="flex items-center space-x-2 bg-gray-800/50 hover:bg-gray-800/70 rounded-lg px-3 py-2 cursor-pointer transition-all"
                >
                  <Checkbox
                    id={`participant-${member.id}`}
                    checked={selectedParticipants.includes(member.id)}
                    onCheckedChange={() => toggleParticipant(member.id)}
                    className="h-4 w-4 text-emerald-400 focus:ring-emerald-500 rounded"
                  />
                  {member.avatar && (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  )}
                  <span className="text-sm text-gray-300 truncate">{member.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preferred Payment Methods - Consistent Grid Layout */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-emerald-400" />
                <h4 className="text-sm font-semibold text-gray-200">Preferred payment methods</h4>
              </div>
              <button
                type="button"
                onClick={selectAllPaymentMethods}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                {allPaymentMethodsSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3">
              {paymentMethodOptions.map(method => (
                <label
                  key={method.id}
                  htmlFor={`payment-${method.id}`}
                  className="flex items-center justify-center space-x-2 bg-gray-900/40 border border-white/10 hover:bg-gray-800/60 rounded-lg h-10 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-emerald-400/30"
                >
                  <Checkbox
                    id={`payment-${method.id}`}
                    checked={selectedPaymentMethods.includes(method.id)}
                    onCheckedChange={() => togglePaymentMethod(method.id)}
                    className="h-4 w-4 text-emerald-400 focus:ring-emerald-500 rounded"
                  />
                  <span className="text-gray-200 text-sm">{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!amount || !description || selectedParticipants.length === 0}
          >
            Add Payment Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};