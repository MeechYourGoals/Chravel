import React from 'react';
import { Shield, Bot, Lock, CheckCircle, XCircle } from 'lucide-react';
import { PrivacyMode, PRIVACY_MODE_CONFIG, getDefaultPrivacyMode } from '../types/privacy';
import { Card, CardContent } from './ui/card';

interface PrivacyModeSelectorProps {
  tripType: 'consumer' | 'pro' | 'event';
  selectedMode: PrivacyMode;
  onModeChange: (mode: PrivacyMode) => void;
  showOverrideOption?: boolean;
}

export const PrivacyModeSelector = ({
  tripType,
  selectedMode,
  onModeChange,
  showOverrideOption = true
}: PrivacyModeSelectorProps) => {
  const defaultMode = getDefaultPrivacyMode(tripType);
  const isOverriding = selectedMode !== defaultMode;

  return (
    <div className="space-y-2">
      {/* Inline label */}
      <label className="block text-sm font-medium text-slate-300 flex items-center gap-1.5">
        <Shield size={14} className="text-slate-400" />
        Privacy Mode
        <span className="text-xs text-slate-400 font-normal ml-1">
          (Recommended: {PRIVACY_MODE_CONFIG[defaultMode].label})
        </span>
      </label>

      {/* Compact privacy mode options */}
      <div className="grid gap-2">
        {Object.entries(PRIVACY_MODE_CONFIG).map(([mode, config]) => (
          <div
            key={mode}
            className={`cursor-pointer transition-all border rounded-lg p-2.5 ${
              selectedMode === mode
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
            }`}
            onClick={() => onModeChange(mode as PrivacyMode)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <div className="text-lg">{config.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-medium text-white">
                      {config.label}
                    </h4>
                    {mode === defaultMode && (
                      <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">
                        Recommended
                      </span>
                    )}
                    {isOverriding && selectedMode === mode && (
                      <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded">
                        Override
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{config.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span>{config.features.message_encryption === 'e2ee' ? 'E2EE' : 'Encrypted'}</span>
                    <span>•</span>
                    <span>{config.compliance.join(', ')}</span>
                  </div>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedMode === mode
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-slate-400'
              }`}>
                {selectedMode === mode && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Compact guidance for high privacy mode */}
      {selectedMode === 'high' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex items-start gap-2">
          <Lock className="text-amber-400 mt-0.5 flex-shrink-0" size={14} />
          <p className="text-xs text-amber-300/90">
            End-to-end encryption is enabled. AI access can remain on unless trip admins disable it.
          </p>
        </div>
      )}
    </div>
  );
};