import React from 'react';
import {
  CalendarPlus,
  CheckSquare,
  BarChart3,
  MapPin,
  Home,
  ListChecks,
  ExternalLink,
} from 'lucide-react';

export interface ConciergeActionResult {
  actionType: string;
  success: boolean;
  message: string;
  entityId?: string;
  entityName?: string;
  scope?: string;
}

interface ConciergeActionCardProps {
  action: ConciergeActionResult;
  onNavigate?: (tab: string) => void;
}

const ACTION_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; tab: string; color: string }
> = {
  add_to_calendar: {
    icon: CalendarPlus,
    label: 'Calendar Event',
    tab: 'calendar',
    color: 'blue',
  },
  create_task: {
    icon: CheckSquare,
    label: 'Task',
    tab: 'tasks',
    color: 'green',
  },
  create_poll: {
    icon: BarChart3,
    label: 'Poll',
    tab: 'polls',
    color: 'purple',
  },
  save_place: {
    icon: MapPin,
    label: 'Saved Place',
    tab: 'places',
    color: 'orange',
  },
  set_basecamp: {
    icon: Home,
    label: 'Basecamp',
    tab: 'places',
    color: 'indigo',
  },
  add_to_agenda: {
    icon: ListChecks,
    label: 'Agenda Item',
    tab: 'agenda',
    color: 'teal',
  },
};

const COLOR_CLASSES: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    text: 'text-blue-300',
  },
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: 'text-green-400',
    text: 'text-green-300',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: 'text-purple-400',
    text: 'text-purple-300',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: 'text-orange-400',
    text: 'text-orange-300',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    icon: 'text-indigo-400',
    text: 'text-indigo-300',
  },
  teal: {
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    icon: 'text-teal-400',
    text: 'text-teal-300',
  },
};

export const ConciergeActionCard: React.FC<ConciergeActionCardProps> = ({ action, onNavigate }) => {
  const config = ACTION_CONFIG[action.actionType];
  if (!config) return null;

  const colors = COLOR_CLASSES[config.color] || COLOR_CLASSES.blue;
  const Icon = config.icon;

  if (!action.success) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
        <Icon size={16} className="mt-0.5 shrink-0 text-red-400" />
        <div className="min-w-0">
          <p className="font-medium text-red-300">Failed to create {config.label.toLowerCase()}</p>
          <p className="text-red-400/80 text-xs mt-0.5">{action.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border ${colors.border} ${colors.bg} p-3 text-sm`}
    >
      <Icon size={16} className={`mt-0.5 shrink-0 ${colors.icon}`} />
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${colors.text}`}>{config.label} created</p>
        <p className="text-gray-400 text-xs mt-0.5 truncate">{action.message}</p>
      </div>
      {onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate(config.tab)}
          className={`shrink-0 flex items-center gap-1 text-xs ${colors.text} hover:underline`}
        >
          View
          <ExternalLink size={10} />
        </button>
      )}
    </div>
  );
};
