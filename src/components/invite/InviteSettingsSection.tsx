import React from 'react';

interface InviteSettingsSectionProps {
  requireApproval: boolean;
  expireIn7Days: boolean;
  isProTrip?: boolean;
  onRequireApprovalChange: (checked: boolean) => void;
  onExpireIn7DaysChange: (checked: boolean) => void;
}

export const InviteSettingsSection = ({ 
  requireApproval, 
  expireIn7Days,
  isProTrip = false,
  onRequireApprovalChange, 
  onExpireIn7DaysChange 
}: InviteSettingsSectionProps) => {
  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <label className="text-gray-300 text-sm">Require approval to join</label>
          {isProTrip && (
            <span className="text-xs text-yellow-400 mt-0.5">Pro trips require admin approval for security</span>
          )}
        </div>
        <input
          type="checkbox"
          checked={requireApproval}
          disabled={isProTrip}
          onChange={(e) => onRequireApprovalChange(e.target.checked)}
          className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="text-gray-300 text-sm">Link expires in 7 days</label>
        <input
          type="checkbox"
          checked={expireIn7Days}
          onChange={(e) => onExpireIn7DaysChange(e.target.checked)}
          className="rounded"
        />
      </div>
    </div>
  );
};