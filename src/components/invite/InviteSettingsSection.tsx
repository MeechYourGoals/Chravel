import React from 'react';

interface InviteSettingsSectionProps {
  requireApproval: boolean;
  expireIn7Days: boolean;
  onRequireApprovalChange: (checked: boolean) => void;
  onExpireIn7DaysChange: (checked: boolean) => void;
}

export const InviteSettingsSection = ({ 
  requireApproval, 
  expireIn7Days, 
  onRequireApprovalChange, 
  onExpireIn7DaysChange 
}: InviteSettingsSectionProps) => {
  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-gray-300 text-sm">Require approval to join</label>
        <input
          type="checkbox"
          checked={requireApproval}
          onChange={(e) => onRequireApprovalChange(e.target.checked)}
          className="rounded"
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