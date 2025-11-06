import React from 'react';
import { MessageCircle, Megaphone, CreditCard, Hash, Lock } from 'lucide-react';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';

interface MessageFiltersProps {
  activeFilter: 'all' | 'broadcast' | 'payments' | 'channels';
  onFilterChange: (filter: 'all' | 'broadcast' | 'payments' | 'channels') => void;
  hidePayments?: boolean;
  isPro?: boolean;
  hasChannels?: boolean;
  channelCount?: number;
}

export const MessageFilters = ({ 
  activeFilter, 
  onFilterChange, 
  hidePayments = false,
  isPro = false,
  hasChannels = false,
  channelCount = 0
}: MessageFiltersProps) => {
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
              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' 
              : 'border border-red-600 text-red-400 active:text-white active:bg-red-600/10'
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
        {isPro && (
          <button
            onClick={() => hasChannels && onFilterChange('channels')}
            disabled={!hasChannels}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === 'channels'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                : hasChannels
                ? 'border border-purple-600 text-purple-400 active:text-white active:bg-purple-600/10'
                : 'border border-gray-600 text-gray-600 cursor-not-allowed'
            }`}
            title={!hasChannels ? 'No role channels available. Contact your admin to be added.' : ''}
          >
            {hasChannels ? <Hash size={14} /> : <Lock size={14} />}
            Channels
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
            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' 
            : 'border border-red-600 text-red-400 hover:text-white hover:bg-red-600/10'
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
      {isPro && (
        <button
          onClick={() => hasChannels && onFilterChange('channels')}
          disabled={!hasChannels}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === 'channels'
              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
              : hasChannels
              ? 'border border-purple-600 text-purple-400 hover:text-white hover:bg-purple-600/10'
              : 'border border-gray-600 text-gray-600 cursor-not-allowed'
          }`}
          title={!hasChannels ? 'No role channels available. Contact your admin to be added.' : ''}
        >
          {hasChannels ? <Hash size={16} /> : <Lock size={16} />}
          Channels
        </button>
      )}
    </div>
  );
};
