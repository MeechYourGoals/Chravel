import React from 'react';
import { Shield, Lock, Bot, AlertTriangle } from 'lucide-react';
import { PrivacyMode, getPrivacyModeInfo } from '../types/privacy';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface PrivacyIndicatorProps {
  privacyMode: PrivacyMode;
  showLabel?: boolean;
  variant?: 'minimal' | 'detailed' | 'badge';
  className?: string;
}

export const PrivacyIndicator = ({
  privacyMode,
  showLabel = true,
  variant = 'minimal',
  className = '',
}: PrivacyIndicatorProps) => {
  const config = getPrivacyModeInfo(privacyMode);

  const iconMap = {
    standard: Bot,
    high: Lock,
  };

  const Icon = iconMap[privacyMode];

  const getColorClass = () => {
    switch (privacyMode) {
      case 'standard':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'high':
        return 'text-green-400 bg-green-400/10 border-green-400/30';
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    }
  };

  if (variant === 'badge') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getColorClass()} ${className}`}
            >
              <Icon size={12} />
              {showLabel && config.label}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p className="font-medium">{config.label}</p>
              <p className="text-slate-400">{config.description}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-xl border ${getColorClass()} ${className}`}
      >
        <Icon size={20} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{config.label}</span>
            <span className="text-2xl">{config.icon}</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">{config.description}</p>
        </div>
        {privacyMode === 'high' && (
          <div className="flex items-center gap-1 text-xs text-green-400">
            <Shield size={14} />
            <span>E2EE</span>
          </div>
        )}
      </div>
    );
  }

  // Minimal variant
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 ${className}`}>
            <Icon
              size={16}
              className={privacyMode === 'standard' ? 'text-blue-400' : 'text-green-400'}
            />
            {showLabel && <span className="text-sm text-slate-300">{config.label}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{config.label}</p>
            <p className="text-slate-400">{config.description}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                {config.features.ai_concierge ? (
                  <Bot className="text-blue-400" size={12} />
                ) : (
                  <AlertTriangle className="text-amber-400" size={12} />
                )}
                <span className="text-xs">
                  AI {config.features.ai_concierge ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="text-green-400" size={12} />
                <span className="text-xs">
                  {config.features.message_encryption === 'e2ee' ? 'End-to-End' : 'Server'}{' '}
                  Encrypted
                </span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
