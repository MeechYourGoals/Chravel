import React from 'react';
import {
  CalendarPlus,
  CheckSquare,
  BarChart3,
  MapPin,
  Home,
  ListChecks,
  ExternalLink,
  AlertTriangle,
  Copy,
} from 'lucide-react';

export type ActionResultStatus = 'success' | 'failure' | 'duplicate' | 'skipped';

export interface ConciergeActionResult {
  actionType: string;
  success: boolean;
  message: string;
  entityId?: string;
  entityName?: string;
  scope?: string;
  /** Distinguishes duplicate/skipped from outright failure */
  status?: ActionResultStatus;
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

/** Derive the effective status from the action result */
function getEffectiveStatus(action: ConciergeActionResult): ActionResultStatus {
  if (action.status) return action.status;
  return action.success ? 'success' : 'failure';
}

/** Build a concise title based on status and action type */
function getCardTitle(config: { label: string }, status: ActionResultStatus): string {
  switch (status) {
    case 'success':
      return `${config.label} created`;
    case 'failure':
      return `Failed to create ${config.label.toLowerCase()}`;
    case 'duplicate':
      return `${config.label} already exists`;
    case 'skipped':
      return `${config.label} skipped`;
  }
}

export const ConciergeActionCard: React.FC<ConciergeActionCardProps> = ({ action, onNavigate }) => {
  const config = ACTION_CONFIG[action.actionType];
  if (!config) return null;

  const status = getEffectiveStatus(action);
  const Icon = config.icon;

  // Failure state
  if (status === 'failure') {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
        <div className="min-w-0">
          <p className="font-medium text-red-300">{getCardTitle(config, status)}</p>
          <p className="text-red-400/80 text-xs mt-0.5">{action.message}</p>
        </div>
      </div>
    );
  }

  // Duplicate state
  if (status === 'duplicate') {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
        <Copy size={16} className="mt-0.5 shrink-0 text-yellow-400" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-yellow-300">{getCardTitle(config, status)}</p>
          <p className="text-yellow-400/80 text-xs mt-0.5 truncate">
            {action.entityName || action.message}
          </p>
        </div>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate(config.tab)}
            className="shrink-0 flex items-center gap-1 text-xs text-yellow-300 hover:underline"
          >
            View
            <ExternalLink size={10} />
          </button>
        )}
      </div>
    );
  }

  // Skipped state
  if (status === 'skipped') {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-gray-500/30 bg-gray-500/10 p-3 text-sm">
        <Icon size={16} className="mt-0.5 shrink-0 text-gray-400" />
        <div className="min-w-0">
          <p className="font-medium text-gray-300">{getCardTitle(config, status)}</p>
          <p className="text-gray-400/80 text-xs mt-0.5 truncate">
            {action.entityName || action.message}
          </p>
        </div>
      </div>
    );
  }

  // Success state
  const colors = COLOR_CLASSES[config.color] || COLOR_CLASSES.blue;

  // Build subtitle: prefer entityName, fall back to message
  const subtitle = action.entityName
    ? `${action.scope ? `${action.scope}: ` : ''}${action.entityName}`
    : action.message;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border ${colors.border} ${colors.bg} p-3 text-sm`}
    >
      <Icon size={16} className={`mt-0.5 shrink-0 ${colors.icon}`} />
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${colors.text}`}>{getCardTitle(config, status)}</p>
        <p className="text-gray-400 text-xs mt-0.5 truncate">{subtitle}</p>
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

/**
 * Overflow summary card shown when more than MAX_VISIBLE_CARDS items
 * were completed for a single action type.
 */
interface OverflowSummaryCardProps {
  actionType: string;
  overflowCount: number;
  onNavigate?: (tab: string) => void;
}

export const OverflowSummaryCard: React.FC<OverflowSummaryCardProps> = ({
  actionType,
  overflowCount,
  onNavigate,
}) => {
  const config = ACTION_CONFIG[actionType];
  if (!config || overflowCount <= 0) return null;

  const colors = COLOR_CLASSES[config.color] || COLOR_CLASSES.blue;
  const Icon = config.icon;
  const label = config.label.toLowerCase();
  const plural = overflowCount === 1 ? label : `${label}s`;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border ${colors.border} ${colors.bg} p-2.5 text-sm`}
    >
      <Icon size={14} className={`shrink-0 ${colors.icon}`} />
      <span className={`text-xs ${colors.text}`}>
        + {overflowCount} more {plural} added
      </span>
      {onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate(config.tab)}
          className={`ml-auto shrink-0 flex items-center gap-1 text-xs ${colors.text} hover:underline`}
        >
          View all
          <ExternalLink size={10} />
        </button>
      )}
    </div>
  );
};

/**
 * Failure summary card shown when multiple items failed within a single action type.
 */
interface FailureSummaryCardProps {
  actionType: string;
  failureCount: number;
}

export const FailureSummaryCard: React.FC<FailureSummaryCardProps> = ({
  actionType,
  failureCount,
}) => {
  const config = ACTION_CONFIG[actionType];
  if (!config || failureCount <= 0) return null;

  const label = config.label.toLowerCase();
  const plural = failureCount === 1 ? label : `${label}s`;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-sm">
      <AlertTriangle size={14} className="shrink-0 text-red-400" />
      <span className="text-xs text-red-300">
        {failureCount} {plural} could not be added
      </span>
    </div>
  );
};
