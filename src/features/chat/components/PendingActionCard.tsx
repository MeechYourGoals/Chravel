import React from 'react';
import { CalendarPlus, CheckSquare, BarChart3, Check, X, Loader2 } from 'lucide-react';
import type { PendingAction } from '@/hooks/usePendingActions';

interface PendingActionCardProps {
  action: PendingAction;
  onConfirm: (actionId: string) => void;
  onReject: (actionId: string) => void;
  isConfirming: boolean;
  isRejecting: boolean;
}

const TOOL_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  createTask: { icon: CheckSquare, label: 'Task', color: 'text-green-400' },
  createPoll: { icon: BarChart3, label: 'Poll', color: 'text-blue-400' },
  addToCalendar: { icon: CalendarPlus, label: 'Calendar Event', color: 'text-purple-400' },
};

function getActionTitle(action: PendingAction): string {
  const payload = action.payload as Record<string, unknown>;
  switch (action.tool_name) {
    case 'createTask':
      return (payload.title as string) || 'Untitled task';
    case 'createPoll':
      return (payload.question as string) || 'Untitled poll';
    case 'addToCalendar':
      return (payload.title as string) || 'Untitled event';
    default:
      return 'Unknown action';
  }
}

function getActionDetail(action: PendingAction): string | null {
  const payload = action.payload as Record<string, unknown>;
  switch (action.tool_name) {
    case 'createTask':
      return (payload.description as string) || null;
    case 'createPoll': {
      const options = payload.options as Array<{ text?: string }> | undefined;
      if (!Array.isArray(options)) return null;
      return options
        .map(o => o.text || '')
        .filter(Boolean)
        .join(', ');
    }
    case 'addToCalendar': {
      const parts: string[] = [];
      if (payload.start_time) {
        try {
          parts.push(new Date(payload.start_time as string).toLocaleString());
        } catch {
          // ignore bad date
        }
      }
      if (payload.location) parts.push(payload.location as string);
      return parts.join(' · ') || null;
    }
    default:
      return null;
  }
}

export function PendingActionCard({
  action,
  onConfirm,
  onReject,
  isConfirming,
  isRejecting,
}: PendingActionCardProps) {
  const config = TOOL_CONFIG[action.tool_name] || {
    icon: CheckSquare,
    label: 'Action',
    color: 'text-gray-400',
  };
  const Icon = config.icon;
  const title = getActionTitle(action);
  const detail = getActionDetail(action);
  const busy = isConfirming || isRejecting;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-amber-400/80 font-medium">
            AI wants to create a {config.label}
          </p>
          <p className="text-sm text-white font-medium truncate">{title}</p>
          {detail && <p className="text-xs text-gray-400 truncate mt-0.5">{detail}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm(action.id)}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium py-1.5 px-3 transition-colors disabled:opacity-50"
        >
          {isConfirming ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Confirm
        </button>
        <button
          type="button"
          onClick={() => onReject(action.id)}
          disabled={busy}
          className="flex items-center justify-center gap-1.5 rounded-md bg-gray-700/50 hover:bg-gray-700 text-gray-400 text-xs font-medium py-1.5 px-3 transition-colors disabled:opacity-50"
        >
          {isRejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          Dismiss
        </button>
      </div>
    </div>
  );
}
