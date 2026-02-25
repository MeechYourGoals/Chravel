import React from 'react';
import { Lock } from 'lucide-react';

interface InviteSettingsSectionProps {
  requireApproval: boolean;
  expireIn7Days: boolean;
  onRequireApprovalChange: (checked: boolean) => void;
  onExpireIn7DaysChange: (checked: boolean) => void;
  tripType?: 'consumer' | 'pro' | 'event';
}

export const InviteSettingsSection = ({
  requireApproval,
  expireIn7Days,
  onRequireApprovalChange,
  onExpireIn7DaysChange,
  tripType = 'consumer',
}: InviteSettingsSectionProps) => {
  // Pro/Event trips ALWAYS require approval - this is enforced on the backend
  // but we show the UI to make it clear to the user
  const isProOrEvent = tripType === 'pro' || tripType === 'event';
  const effectiveRequireApproval = isProOrEvent ? true : requireApproval;

  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-gray-300 text-sm">Require approval to join</label>
          {isProOrEvent && (
            <span
              className="inline-flex items-center gap-1 text-xs text-amber-400"
              title="Pro and Event trips always require approval for security"
            >
              <Lock size={12} />
              <span>Required</span>
            </span>
          )}
        </div>
        <input
          type="checkbox"
          checked={effectiveRequireApproval}
          onChange={e => onRequireApprovalChange(e.target.checked)}
          disabled={isProOrEvent}
          className={`rounded ${isProOrEvent ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
      </div>
      {isProOrEvent && (
        <p className="text-xs text-gray-500 pl-0">
          {tripType === 'event' ? 'Event' : 'Pro'} trips always require approval so you can vet
          attendees
        </p>
      )}
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
