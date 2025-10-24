import React from 'react';
import { HardDrive, AlertTriangle, Crown } from 'lucide-react';
import { useStorageQuota } from '../hooks/useStorageQuota';
import { useConsumerSubscription } from '../hooks/useConsumerSubscription';

interface StorageQuotaBarProps {
  tripId?: string;
  showDetails?: boolean;
}

export const StorageQuotaBar: React.FC<StorageQuotaBarProps> = ({ tripId, showDetails = true }) => {
  const { quota, loading } = useStorageQuota(tripId);
  const { isSubscribed, upgradeToTier } = useConsumerSubscription();

  if (loading) {
    return (
      <div className="animate-pulse bg-white/5 h-2 rounded-full w-full" />
    );
  }

  const getBarColor = () => {
    if (quota.isOverLimit) return 'bg-red-500';
    if (quota.isNearLimit) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (quota.isOverLimit) return 'text-red-400';
    if (quota.isNearLimit) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="space-y-2">
      {showDetails && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <HardDrive size={16} className={getTextColor()} />
            <span className="text-gray-300">
              Storage: {quota.usedMB.toFixed(1)} MB / {quota.quotaMB} MB
            </span>
          </div>
          <span className={`font-medium ${getTextColor()}`}>
            {quota.percentUsed.toFixed(1)}%
          </span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`absolute left-0 top-0 h-full ${getBarColor()} transition-all duration-500`}
          style={{ width: `${Math.min(quota.percentUsed, 100)}%` }}
        />
      </div>

      {/* Warning/Upgrade Messages */}
      {quota.isOverLimit && !isSubscribed && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-300 text-sm font-medium mb-1">Storage Limit Reached</p>
            <p className="text-red-200/80 text-xs mb-2">
              You've reached your 500 MB storage limit. Upgrade for unlimited storage.
            </p>
            <button
              onClick={() => upgradeToTier('starter', 'annual')}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-1.5 rounded-lg text-xs font-bold hover:scale-105 transition-transform"
            >
              <Crown size={14} className="inline mr-1" />
              View Plans
            </button>
          </div>
        </div>
      )}

      {quota.isNearLimit && !quota.isOverLimit && !isSubscribed && (
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-yellow-300 text-sm font-medium mb-1">Approaching Storage Limit</p>
            <p className="text-yellow-200/80 text-xs mb-2">
              You've used {quota.percentUsed.toFixed(0)}% of your storage. Upgrade for unlimited storage.
            </p>
            <button
              onClick={() => upgradeToTier('starter', 'annual')}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-1.5 rounded-lg text-xs font-bold hover:scale-105 transition-transform"
            >
              <Crown size={14} className="inline mr-1" />
              View Plans
            </button>
          </div>
        </div>
      )}

      {isSubscribed && showDetails && (
        <div className="text-center">
          <span className="text-xs text-gray-400">
            ✨ Unlimited storage with your plan
          </span>
        </div>
      )}
    </div>
  );
};
