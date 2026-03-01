/**
 * SmartImportChips
 *
 * Quick-action chips that appear above the chat input when attachments
 * (images/PDFs) are present. Trains users to use Smart Import features
 * without needing to type "magic words".
 */

import React from 'react';
import { CalendarPlus, MapPin, ListChecks } from 'lucide-react';

interface SmartImportChipsProps {
  onAction: (action: 'calendar' | 'trip' | 'tasks') => void;
  disabled?: boolean;
}

const CHIPS = [
  {
    id: 'calendar' as const,
    icon: CalendarPlus,
    label: 'Add to calendar',
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25',
  },
  {
    id: 'trip' as const,
    icon: MapPin,
    label: 'Save to trip',
    color: 'bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25',
  },
  {
    id: 'tasks' as const,
    icon: ListChecks,
    label: 'Create tasks',
    color: 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25',
  },
];

export const SmartImportChips: React.FC<SmartImportChipsProps> = ({ onAction, disabled }) => {
  return (
    <div className="flex gap-2 overflow-x-auto px-1 pb-1">
      {CHIPS.map(chip => {
        const Icon = chip.icon;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onAction(chip.id)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${chip.color}`}
          >
            <Icon size={12} />
            {chip.label}
          </button>
        );
      })}
    </div>
  );
};
