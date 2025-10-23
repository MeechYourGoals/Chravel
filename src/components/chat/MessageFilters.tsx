import React from 'react';
import { MessageCircle, Megaphone, CreditCard } from 'lucide-react';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';

interface MessageFiltersProps {
  activeFilter: 'all' | 'broadcast' | 'payments';
  onFilterChange: (filter: 'all' | 'broadcast' | 'payments') => void;
  hidePayments?: boolean;
}

export const MessageFilters = ({ activeFilter, onFilterChange, hidePayments = false }: MessageFiltersProps) => {
  const isMobilePortrait = useMobilePortrait();

  // Mobile Portrait: Compressed tab bar (40px height)
  if (isMobilePortrait) {
    return (
      <div className="flex justify-center gap-2">
        <button
          onClick={() => onFilterChange('all')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === 'all'
              ? 'bg-blue-600 text-white' 
              : 'border border-gray-600 text-gray-400 active:text-white active:border-gray-500'
          }`}
        >
          <MessageCircle size={14} />
          All Messages
        </button>
        <button
          onClick={() => onFilterChange('broadcast')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === 'broadcast' 
              ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white' 
              : 'border border-orange-600 text-orange-400 active:text-white active:bg-orange-600/10'
          }`}
        >
          <Megaphone size={14} />
          Broadcasts
        </button>
        {!hidePayments && (
          <button
            onClick={() => onFilterChange('payments')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === 'payments' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                : 'border border-green-600 text-green-400 active:text-white active:bg-green-600/10'
            }`}
          >
            <CreditCard size={14} />
            Payments
          </button>
        )}
      </div>
    );
  }

  // Desktop/Tablet Landscape: Original styling unchanged
  return (
    <div className="flex justify-center gap-4">
      <button
        onClick={() => onFilterChange('all')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          activeFilter === 'all'
            ? 'bg-blue-600 text-white' 
            : 'border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500'
        }`}
      >
        <MessageCircle size={16} />
        All Messages
      </button>
      <button
        onClick={() => onFilterChange('broadcast')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          activeFilter === 'broadcast' 
            ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white' 
            : 'border border-orange-600 text-orange-400 hover:text-white hover:bg-orange-600/10'
        }`}
      >
        <Megaphone size={16} />
        Broadcasts
      </button>
      {!hidePayments && (
        <button
          onClick={() => onFilterChange('payments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === 'payments' 
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
              : 'border border-green-600 text-green-400 hover:text-white hover:bg-green-600/10'
          }`}
        >
          <CreditCard size={16} />
          Payments
        </button>
      )}
    </div>
  );
};
