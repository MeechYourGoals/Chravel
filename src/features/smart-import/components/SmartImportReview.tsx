import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plane,
  Hotel,
  Car,
  Ticket,
  Utensils,
  Train,
  CalendarCheck,
  Map,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SmartImportCandidate } from '../types';

export interface ReviewCandidatesProps {
  candidates: SmartImportCandidate[];
  onAccept: (acceptedCandidates: SmartImportCandidate[]) => void;
  onCancel: () => void;
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  flight: { icon: Plane, color: 'text-blue-500', label: 'Flight' },
  lodging: { icon: Hotel, color: 'text-indigo-500', label: 'Lodging' },
  ground_transport: { icon: Car, color: 'text-orange-500', label: 'Transport' },
  event_ticket: { icon: Ticket, color: 'text-pink-500', label: 'Event' },
  sports_ticket: { icon: Ticket, color: 'text-red-500', label: 'Sports' },
  restaurant_reservation: { icon: Utensils, color: 'text-emerald-500', label: 'Restaurant' },
  rail_bus_ferry: { icon: Train, color: 'text-cyan-500', label: 'Rail/Bus/Ferry' },
  conference_registration: {
    icon: CalendarCheck,
    color: 'text-violet-500',
    label: 'Conference',
  },
  generic_itinerary_item: { icon: Map, color: 'text-slate-500', label: 'Itinerary' },
};

export const SmartImportReview: React.FC<ReviewCandidatesProps> = ({
  candidates,
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

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      const accepted = candidates.filter(c => selectedIds.has(c.id));
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-lg font-medium">Review Imported Items</h3>
          <p className="text-sm text-muted-foreground">
            Select the reservations you want to add to your trip.
          </p>
        </div>
        <div className="text-sm font-medium">
          {selectedIds.size} of {candidates.length} selected
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {candidates.map(candidate => {
          const type = (candidate.reservation_data?.type as string) || 'unknown';
          const config = typeConfig[type as string] || { icon: Plane, color: 'text-gray-500', label: 'Item' };
          const Icon = config.icon;

          const data = candidate.reservation_data as Record<string, string>;

          let title = 'Unknown Reservation';
          let subtitle = '';

          if (type === 'flight') {
            title = `${data.airline_name || data.airline_code} Flight ${data.flight_number || ''}`;
            subtitle = `${data.departure_city || data.departure_airport_code} to ${data.arrival_city || data.arrival_airport_code}`;
          } else if (type === 'lodging') {
            title = data.property_name || 'Hotel Stay';
            subtitle = data.city || data.address || '';
          } else if (type === 'ground_transport') {
            title = data.provider_name || 'Ground Transport';
            subtitle = `${data.pickup_location} to ${data.dropoff_location}`;
          } else if (type === 'event_ticket') {
            title = data.event_name || 'Event Ticket';
            subtitle = data.venue_name || data.city || '';
          } else if (type === 'sports_ticket') {
            title = data.event_name || 'Sports Ticket';
            subtitle = data.venue_name || data.city || '';
          } else if (type === 'restaurant_reservation') {
            title = data.restaurant_name || 'Restaurant Reservation';
            subtitle = data.city || '';
          } else if (type === 'rail_bus_ferry') {
            title = data.provider_name || 'Rail/Bus/Ferry';
            subtitle = `${data.departure_location || ''} to ${data.arrival_location || ''}`;
          } else if (type === 'conference_registration') {
            title = data.event_name || 'Conference Registration';
            subtitle = data.venue_name || data.city || '';
          } else if (type === 'generic_itinerary_item') {
            title = data.item_label || 'Itinerary Item';
            subtitle = data.location || data.provider_name || '';
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

                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-background border`}
                >
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
