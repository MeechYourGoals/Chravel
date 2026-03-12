import React from 'react';
import { Lock } from 'lucide-react';

interface InviteSettingsSectionProps {
  expireIn7Days: boolean;
  onExpireIn7DaysChange: (checked: boolean) => void;
}

export const InviteSettingsSection = ({
  expireIn7Days,
  onExpireIn7DaysChange,
}: InviteSettingsSectionProps) => {
  return (
    <div className="mb-3 space-y-2">
      {/* Approval policy — always required, displayed as static info */}
      <div className="flex items-center gap-2">
        <Lock size={12} className="text-amber-400 shrink-0" />
        <span className="text-amber-400 text-xs font-medium">Required</span>
        <span className="text-gray-300 text-sm">Require approval to join</span>
      </div>
      <p className="text-xs text-gray-500 pl-0">
        Someone in the trip must approve new members before they can join
      </p>

      {/* Expiry toggle — user-controllable */}
      <div className="flex items-center justify-between">
        <label className="text-gray-300 text-sm">Link expires in 7 days</label>
        <input
          type="checkbox"
          checked={expireIn7Days}
          onChange={e => onExpireIn7DaysChange(e.target.checked)}
          className="rounded"
        />
      </div>
    </div>
  );
};
