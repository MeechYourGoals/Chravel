import React from 'react';
import {
  ConciergeActionCard,
  OverflowSummaryCard,
  FailureSummaryCard,
  type ConciergeActionResult,
} from './ConciergeActionCard';

/** Maximum number of individual item cards shown per action type before collapsing */
const MAX_VISIBLE_CARDS = 5;

interface ConciergeActionCardGroupProps {
  actions: ConciergeActionResult[];
  onNavigate?: (tab: string) => void;
}

interface ActionGroup {
  actionType: string;
  successes: ConciergeActionResult[];
  failures: ConciergeActionResult[];
  duplicates: ConciergeActionResult[];
  skipped: ConciergeActionResult[];
}

/** Derive status for grouping from an action result */
function deriveStatus(
  action: ConciergeActionResult,
): 'success' | 'failure' | 'duplicate' | 'skipped' {
  if (action.status) return action.status;
  return action.success ? 'success' : 'failure';
}

/**
 * Groups actions by actionType, preserving insertion order.
 * Within each group, separates successes, failures, duplicates, and skipped.
 */
function groupActions(actions: ConciergeActionResult[]): ActionGroup[] {
  const groupMap = new Map<string, ActionGroup>();
  const order: string[] = [];

  for (const action of actions) {
    if (!groupMap.has(action.actionType)) {
      groupMap.set(action.actionType, {
        actionType: action.actionType,
        successes: [],
        failures: [],
        duplicates: [],
        skipped: [],
      });
      order.push(action.actionType);
    }

    const group = groupMap.get(action.actionType)!;
    const status = deriveStatus(action);

    switch (status) {
      case 'success':
        group.successes.push(action);
        break;
      case 'failure':
        group.failures.push(action);
        break;
      case 'duplicate':
        group.duplicates.push(action);
        break;
      case 'skipped':
        group.skipped.push(action);
        break;
    }
  }

  return order.map(type => groupMap.get(type)!);
}

/**
 * Renders concierge action result cards with intelligent grouping.
 *
 * Per action type:
 * - 1 item: 1 detailed card
 * - 2-5 items: 1 card per item
 * - >5 items: max 5 detailed cards + 1 overflow summary card
 *
 * Failures and duplicates are rendered separately with distinct visual treatment.
 */
export const ConciergeActionCardGroup: React.FC<ConciergeActionCardGroupProps> = ({
  actions,
  onNavigate,
}) => {
  if (!actions || actions.length === 0) return null;

  const groups = groupActions(actions);

  return (
    <div className="space-y-2">
      {groups.map(group => {
        const visibleSuccesses = group.successes.slice(0, MAX_VISIBLE_CARDS);
        const overflowCount = Math.max(0, group.successes.length - MAX_VISIBLE_CARDS);

        return (
          <div key={group.actionType} className="space-y-1.5">
            {/* Success cards (up to MAX_VISIBLE_CARDS) */}
            {visibleSuccesses.map((action, idx) => (
              <ConciergeActionCard
                key={`${group.actionType}-success-${idx}`}
                action={action}
                onNavigate={onNavigate}
              />
            ))}

            {/* Overflow summary for successes beyond the limit */}
            {overflowCount > 0 && (
              <OverflowSummaryCard
                actionType={group.actionType}
                overflowCount={overflowCount}
                onNavigate={onNavigate}
              />
            )}

            {/* Duplicate cards (always show individually, up to limit) */}
            {group.duplicates.slice(0, MAX_VISIBLE_CARDS).map((action, idx) => (
              <ConciergeActionCard
                key={`${group.actionType}-duplicate-${idx}`}
                action={action}
                onNavigate={onNavigate}
              />
            ))}
            {group.duplicates.length > MAX_VISIBLE_CARDS && (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2.5 text-sm">
                <span className="text-xs text-yellow-300">
                  + {group.duplicates.length - MAX_VISIBLE_CARDS} more already existed
                </span>
              </div>
            )}

            {/* Skipped cards (show up to limit) */}
            {group.skipped.slice(0, MAX_VISIBLE_CARDS).map((action, idx) => (
              <ConciergeActionCard
                key={`${group.actionType}-skipped-${idx}`}
                action={action}
                onNavigate={onNavigate}
              />
            ))}

            {/* Failure cards: show individually up to 3, then summarize */}
            {group.failures.slice(0, 3).map((action, idx) => (
              <ConciergeActionCard
                key={`${group.actionType}-failure-${idx}`}
                action={action}
                onNavigate={onNavigate}
              />
            ))}
            {group.failures.length > 3 && (
              <FailureSummaryCard
                actionType={group.actionType}
                failureCount={group.failures.length - 3}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
