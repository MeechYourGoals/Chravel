import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plane,
  Hotel,
  Car,
  Ticket,
  Loader2,
  AlertTriangle,
  RefreshCw,
  UtensilsCrossed,
  Train,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Map Gmail extraction types → artifact-ingest artifact_type overrides
const RESERVATION_TO_ARTIFACT_TYPE: Record<string, string> = {
  flight: 'flight',
  lodging: 'hotel',
  ground_transport: 'generic_document',
  event_ticket: 'event_ticket',
  dining_reservation: 'restaurant_reservation',
  rail_ticket: 'generic_document',
};

export interface ReviewCandidatesProps {
  candidates: any[];
  tripId?: string;
  onAccept: (acceptedCandidates: any[]) => void;
  onCancel: () => void;
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  flight: { icon: Plane, color: 'text-blue-500', label: 'Flight' },
  lodging: { icon: Hotel, color: 'text-indigo-500', label: 'Lodging' },
  ground_transport: { icon: Car, color: 'text-orange-500', label: 'Transport' },
  event_ticket: { icon: Ticket, color: 'text-pink-500', label: 'Event' },
  dining_reservation: { icon: UtensilsCrossed, color: 'text-amber-500', label: 'Dining' },
  rail_ticket: { icon: Train, color: 'text-green-500', label: 'Train' },
};

type FilterTab =
  | 'all'
  | 'flight'
  | 'lodging'
  | 'event_ticket'
  | 'dining_reservation'
  | 'rail_ticket'
  | 'ground_transport';

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'flight', label: 'Flights' },
  { key: 'lodging', label: 'Lodging' },
  { key: 'event_ticket', label: 'Events' },
  { key: 'dining_reservation', label: 'Dining' },
  { key: 'rail_ticket', label: 'Train' },
  { key: 'ground_transport', label: 'Transport' },
];

export const SmartImportReview: React.FC<ReviewCandidatesProps> = ({
  candidates,
  tripId,
  onAccept,
  onCancel,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Pre-select only candidates that are likely relevant and not cancelled
    return new Set(
      candidates
        .filter(c => {
          const data = c.reservation_data;
          if (!data) return false;
          if (data.is_cancellation === true) return false;
          const score = data._relevance_score as number | undefined;
          // Auto-deselect items with low trip relevance (below 0.4)
          if (score !== undefined && score < 0.4) return false;
          return true;
        })
        .map(c => c.id),
    );
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const visibleCandidates = useMemo(() => {
    if (activeFilter === 'all') return candidates;
    return candidates.filter(c => c.reservation_data?.type === activeFilter);
  }, [candidates, activeFilter]);

  // Only count tabs with at least one candidate
  const tabsWithData = useMemo(() => {
    const typeSet = new Set(candidates.map(c => c.reservation_data?.type));
    return filterTabs.filter(t => t.key === 'all' || typeSet.has(t.key));
  }, [candidates]);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAllVisible = () => {
    const next = new Set(selectedIds);
    visibleCandidates.forEach(c => next.add(c.id));
    setSelectedIds(next);
  };

  const deselectAllVisible = () => {
    const next = new Set(selectedIds);
    visibleCandidates.forEach(c => next.delete(c.id));
    setSelectedIds(next);
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      const accepted = candidates.filter(c => selectedIds.has(c.id));
      const rejected = candidates.filter(c => !selectedIds.has(c.id));

      // Persist accepted candidates as trip artifacts
      let persistedCount = 0;
      let failedCount = 0;

      if (tripId && accepted.length > 0) {
        const ingestResults = await Promise.allSettled(
          accepted.map(async candidate => {
            const resData = candidate.reservation_data || {};
            const reservationType = resData.type as string | undefined;
            const artifactTypeOverride = reservationType
              ? RESERVATION_TO_ARTIFACT_TYPE[reservationType]
              : undefined;

            await supabase.functions.invoke('artifact-ingest', {
              body: {
                tripId,
                sourceType: 'gmail_import',
                text: JSON.stringify(resData),
                artifactTypeOverride,
                metadata: {
                  gmail_message_id: resData._gmail_message_id,
                  email_subject: resData._email_subject,
                  smart_import_candidate_id: candidate.id,
                },
              },
            });
          }),
        );

        persistedCount = ingestResults.filter(r => r.status === 'fulfilled').length;
        failedCount = ingestResults.filter(r => r.status === 'rejected').length;

        // Mark accepted candidates (best-effort — don't fail the whole accept if this errors)
        await (supabase as any)
          .from('smart_import_candidates')
          .update({ status: 'accepted' })
          .in(
            'id',
            accepted.map(c => c.id),
          );
      }

      // Mark rejected candidates (regardless of whether tripId is present)
      if (rejected.length > 0) {
        await (supabase as any)
          .from('smart_import_candidates')
          .update({ status: 'rejected' })
          .in(
            'id',
            rejected.map(c => c.id),
          );
      }

      if (failedCount > 0) {
        toast.warning(
          `${persistedCount} of ${accepted.length} item${accepted.length !== 1 ? 's' : ''} saved.`,
          {
            description: `${failedCount} item${failedCount !== 1 ? 's' : ''} may not have been fully indexed.`,
          },
        );
      } else if (accepted.length > 0) {
        toast.success(
          `Added ${accepted.length} item${accepted.length !== 1 ? 's' : ''} to your trip`,
        );
      }

      await onAccept(accepted);
    } catch (error: unknown) {
      toast.error('Failed to save imported items', { description: (error as Error)?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!candidates || candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Plane className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-medium">No new reservations found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            We couldn't find any travel confirmations for this trip in your recent emails, or they
            have already been imported.
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Go Back
        </Button>
      </div>
    );
  }

  const visibleSelectedCount = visibleCandidates.filter(c => selectedIds.has(c.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-lg font-medium">Review Imported Items</h3>
          <p className="text-sm text-muted-foreground">
            Select the reservations you want to add to your trip.
          </p>
        </div>
        <div className="text-sm font-medium text-right">
          <span>
            {selectedIds.size} of {candidates.length} selected
          </span>
        </div>
      </div>

      {/* Type filter tabs */}
      {tabsWithData.length > 2 && (
        <div className="flex gap-1 flex-wrap">
          {tabsWithData.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeFilter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              {tab.key !== 'all' && (
                <span className="ml-1 opacity-60">
                  {candidates.filter(c => c.reservation_data?.type === tab.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Bulk action row */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={selectAllVisible}
          className="text-primary hover:underline"
          disabled={visibleSelectedCount === visibleCandidates.length}
        >
          Select All{activeFilter !== 'all' ? ' Visible' : ''}
        </button>
        <span className="text-muted-foreground">·</span>
        <button
          onClick={deselectAllVisible}
          className="text-muted-foreground hover:underline"
          disabled={visibleSelectedCount === 0}
        >
          Deselect All{activeFilter !== 'all' ? ' Visible' : ''}
        </button>
        {activeFilter !== 'all' && (
          <span className="text-muted-foreground ml-1">
            ({visibleSelectedCount} of {visibleCandidates.length} visible selected)
          </span>
        )}
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {visibleCandidates.map(candidate => {
          const type = candidate.reservation_data?.type || 'unknown';
          const config = typeConfig[type] || { icon: Plane, color: 'text-gray-500', label: 'Item' };
          const Icon = config.icon;

          const data = candidate.reservation_data;

          let title = 'Unknown Reservation';
          let subtitle = '';

          if (type === 'flight') {
            const operatorName = data.airline_name || data.booking_source || data.airline_code;
            const flightId = data.flight_number || data.tail_number || '';
            title = `${operatorName || 'Flight'} ${flightId}`.trim();
            subtitle = `${data.departure_city || data.departure_airport_code || ''} → ${data.arrival_city || data.arrival_airport_code || ''}`;
          } else if (type === 'lodging') {
            title = data.property_name || 'Stay';
            subtitle = data.city || data.address || '';
          } else if (type === 'ground_transport') {
            title = data.provider_name || 'Ground Transport';
            subtitle = `${data.pickup_location || ''} to ${data.dropoff_location || ''}`;
          } else if (type === 'event_ticket') {
            title = data.event_name || 'Event Ticket';
            subtitle = data.venue_name || data.city || '';
          } else if (type === 'dining_reservation') {
            title = data.restaurant_name || 'Dining Reservation';
            subtitle = data.city || data.address || '';
          } else if (type === 'rail_ticket') {
            title = `${data.operator_name || 'Train'} ${data.train_number || ''}`.trim();
            subtitle = `${data.departure_station || ''} → ${data.arrival_station || ''}`;
          }

          const isSelected = selectedIds.has(candidate.id);
          const relevanceScore = data?._relevance_score as number | undefined;
          const relevanceReason = data?._relevance_reason as string | undefined;
          const isCancellation = data?.is_cancellation === true;
          const isModification = data?.is_modification === true;

          return (
            <Card
              key={candidate.id}
              className={`cursor-pointer transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              } ${isCancellation ? 'opacity-60' : ''}`}
              onClick={() => toggleSelection(candidate.id)}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className="mt-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(candidate.id)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-background border">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-medium truncate">{title}</h4>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {config.label}
                    </span>
                    {isCancellation && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Cancelled
                      </span>
                    )}
                    {isModification && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <RefreshCw className="h-2.5 w-2.5" />
                        Updated
                      </span>
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
                  )}
                  {data._email_subject && (
                    <p className="text-xs text-muted-foreground/60 truncate mt-0.5 italic">
                      {data._email_subject}
                    </p>
                  )}
                  {data.confirmation_code && (
                    <p className="text-xs font-mono mt-1 text-muted-foreground/80">
                      Ref: {data.confirmation_code}
                    </p>
                  )}
                  {relevanceScore !== undefined && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[80px]">
                        <div
                          className={`h-full rounded-full ${
                            relevanceScore >= 0.7
                              ? 'bg-green-500'
                              : relevanceScore >= 0.4
                                ? 'bg-amber-500'
                                : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.round(relevanceScore * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(relevanceScore * 100)}% match
                      </span>
                      {relevanceReason && (
                        <span className="text-[10px] text-muted-foreground/70 truncate max-w-[150px]">
                          {relevanceReason}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t mt-6">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleAccept}
          disabled={selectedIds.size === 0 || isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            `Add to Trip (${selectedIds.size})`
          )}
        </Button>
      </div>
    </div>
  );
};
