
import React, { useState } from 'react';
import { X, Sparkles, Calculator } from 'lucide-react';
import { useConsumerSubscription } from '../../hooks/useConsumerSubscription';

interface AISplitHelperProps {
  isOpen: boolean;
  onClose: () => void;
  receiptAmount: number;
  onSplitCalculated: (splitCount: number) => void;
}

export const AISplitHelper = ({ 
  isOpen, 
  onClose, 
  receiptAmount, 
  onSplitCalculated 
}: AISplitHelperProps) => {
  const { isPlus } = useConsumerSubscription();
  const [isCalculating, setIsCalculating] = useState(false);
  const [suggestion, setSuggestion] = useState<string>('');
  const [splitCount, setSplitCount] = useState<number | null>(null);

  const handleCalculate = async () => {
    if (!isPlus) return;
    
    setIsCalculating(true);
    
    // Mock AI calculation - in real implementation, this would call Gemini.
    setTimeout(() => {
      const mockSuggestions = [
        "Based on typical dinner receipts, I suggest splitting between 4-6 people.",
        "For a grocery receipt of this amount, usually 2-4 people are involved.",
        "This looks like a group activity expense, recommend splitting 6-8 ways.",
        "For transportation costs, typically split among all trip participants."
      ];
      
      const randomSuggestion = mockSuggestions[Math.floor(Math.random() * mockSuggestions.length)];
      const suggestedCount = Math.floor(Math.random() * 6) + 3; // Random between 3-8
      
      setSuggestion(randomSuggestion);
      setSplitCount(suggestedCount);
      setIsCalculating(false);
    }, 2000);
  };

  const handleAcceptSuggestion = () => {
    if (splitCount) {
      onSplitCalculated(splitCount);
    }
  };

  if (!isOpen || !isPlus) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">AI Split Helper</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Receipt Info */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-center">
              <div className="text-gray-400 text-sm">Receipt Total</div>
              <div className="text-white font-bold text-2xl">
                ${receiptAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          {!suggestion && !isCalculating && (
            <div className="text-center">
              <Calculator size={32} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-4">
                Let AI analyze this receipt and suggest how many people should split it.
              </p>
              <button
                onClick={handleCalculate}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl transition-colors hover:from-blue-600 hover:to-purple-600"
              >
                Analyze Receipt
              </button>
            </div>
          )}

          {/* Loading State */}
          {isCalculating && (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-300">AI is analyzing your receipt...</p>
            </div>
          )}

          {/* AI Suggestion */}
          {suggestion && splitCount && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Sparkles size={16} className="text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-blue-300 text-sm mb-2">{suggestion}</p>
                    <div className="text-white font-semibold">
                      Recommended split: {splitCount} people
                    </div>
                    <div className="text-gray-300 text-sm">
                      ${(receiptAmount / splitCount).toFixed(2)} per person
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAcceptSuggestion}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl transition-colors hover:from-green-600 hover:to-emerald-600"
                >
                  Use This Split
                </button>
                <button
                  onClick={handleCalculate}
                  className="px-4 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
