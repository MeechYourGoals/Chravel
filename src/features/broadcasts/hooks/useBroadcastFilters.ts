import { useState, useCallback, useMemo } from 'react';

export type BroadcastPriority = 'all' | 'chill' | 'logistics' | 'urgent' | 'emergency';

export interface BroadcastFilters {
  priority: BroadcastPriority;
  dateRange: { start?: Date; end?: Date };
  sender?: string;
  recipients?: string;
}

export const useBroadcastFilters = () => {
  const [priority, setPriority] = useState<BroadcastPriority>('all');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [sender, setSender] = useState<string | undefined>();
  const [recipients, setRecipients] = useState<string | undefined>();

  const applyFilters = useCallback(
    <
      T extends {
        category: string;
        timestamp: Date;
        sender?: string;
        recipients?: string;
      },
    >(
      broadcasts: T[],
    ): T[] => {
      return broadcasts.filter(broadcast => {
        // Priority filter
        if (priority !== 'all' && broadcast.category !== priority) {
          return false;
        }

        // Date range filter
        if (dateRange.start && broadcast.timestamp < dateRange.start) {
          return false;
        }
        if (dateRange.end && broadcast.timestamp > dateRange.end) {
          return false;
        }

        // Sender filter
        if (sender && broadcast.sender !== sender) {
          return false;
        }

        // Recipients filter
        if (recipients && broadcast.recipients !== recipients) {
          return false;
        }

        return true;
      });
    },
    [priority, dateRange, sender, recipients],
  );

  const clearFilters = useCallback(() => {
    setPriority('all');
    setDateRange({});
    setSender(undefined);
    setRecipients(undefined);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      priority !== 'all' ||
      dateRange.start !== undefined ||
      dateRange.end !== undefined ||
      sender !== undefined ||
      recipients !== undefined
    );
  }, [priority, dateRange, sender, recipients]);

  return {
    // State
    priority,
    dateRange,
    sender,
    recipients,

    // Computed
    hasActiveFilters,

    // Actions
    setPriority,
    setDateRange,
    setSender,
    setRecipients,
    applyFilters,
    clearFilters,
  };
};
