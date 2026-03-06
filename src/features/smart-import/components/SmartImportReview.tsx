import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plane, Hotel, Car, Ticket, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface ReviewCandidatesProps {
  candidates: any[];
  onAccept: (acceptedCandidates: any[]) => void;
  onCancel: () => void;
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  flight: { icon: Plane, color: 'text-blue-500', label: 'Flight' },
  lodging: { icon: Hotel, color: 'text-indigo-500', label: 'Lodging' },
  ground_transport: { icon: Car, color: 'text-orange-500', label: 'Transport' },
  event_ticket: { icon: Ticket, color: 'text-pink-500', label: 'Event' },
};

export const SmartImportReview: React.FC<ReviewCandidatesProps> = ({
  candidates,
  onAccept,
  onCancel,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(candidates.map(c => c.id)));
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
    } catch (error: any) {
      toast.error('Failed to save imported items', { description: error.message });
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
          const type = candidate.reservation_data?.type || 'unknown';
          const config = typeConfig[type] || { icon: Plane, color: 'text-gray-500', label: 'Item' };
          const Icon = config.icon;

          const data = candidate.reservation_data;

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
          }

          const isSelected = selectedIds.has(candidate.id);

          return (
            <Card
              key={candidate.id}
              className={`cursor-pointer transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              }`}
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
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium truncate">{title}</h4>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {config.label}
                    </span>
                  </div>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
                  )}
                  {data.confirmation_code && (
                    <p className="text-xs font-mono mt-1 text-muted-foreground/80">
                      Ref: {data.confirmation_code}
                    </p>
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
