import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  SystemMessageCategoryPrefs,
  DEFAULT_SYSTEM_MESSAGE_CATEGORIES,
} from '@/utils/systemMessageCategory';

interface ChatActivitySettingsProps {
  showSystemMessages: boolean;
  categories: SystemMessageCategoryPrefs;
  onShowSystemMessagesChange: (value: boolean) => void;
  onCategoryChange: (category: keyof SystemMessageCategoryPrefs, value: boolean) => void;
  disabled?: boolean;
}

const CATEGORY_LABELS: Record<
  keyof SystemMessageCategoryPrefs,
  { label: string; description: string }
> = {
  member: { label: 'Member Activity', description: 'Joins, leaves, approvals' },
  basecamp: { label: 'Base Camp', description: 'Location changes' },
  uploads: { label: 'Uploads', description: 'Photos and files' },
  polls: { label: 'Polls', description: 'Created and closed polls' },
  calendar: { label: 'Calendar', description: 'Event additions and changes' },
  tasks: { label: 'Tasks', description: 'Task creation and completion' },
  payments: { label: 'Payments', description: 'Expenses and settlements' },
};

export const ChatActivitySettings: React.FC<ChatActivitySettingsProps> = ({
  showSystemMessages,
  categories,
  onShowSystemMessagesChange,
  onCategoryChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Master toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="show-activity" className="text-white font-medium">
            Show activity updates in chat
          </Label>
          <p className="text-sm text-gray-400">Display system messages for trip activity</p>
        </div>
        <Switch
          id="show-activity"
          checked={showSystemMessages}
          onCheckedChange={onShowSystemMessagesChange}
          disabled={disabled}
        />
      </div>

      {/* Category checkboxes */}
      {showSystemMessages && (
        <div className="space-y-3 pl-2 border-l-2 border-white/10 ml-1">
          {(Object.keys(CATEGORY_LABELS) as Array<keyof SystemMessageCategoryPrefs>).map(
            category => {
              const { label, description } = CATEGORY_LABELS[category];
              const isDefault = DEFAULT_SYSTEM_MESSAGE_CATEGORIES[category];

              return (
                <div key={category} className="flex items-start gap-3">
                  <Checkbox
                    id={`cat-${category}`}
                    checked={categories[category]}
                    onCheckedChange={checked => onCategoryChange(category, checked === true)}
                    disabled={disabled}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`cat-${category}`}
                      className="text-white text-sm cursor-pointer"
                    >
                      {label}
                      {!isDefault && (
                        <span className="text-xs text-gray-500 ml-2">(hidden by default)</span>
                      )}
                    </Label>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-500 italic">
        This only affects what you see inside chat. Alerts, export, and event log still include all
        activity.
      </p>
    </div>
  );
};
