import React, { useState, useMemo } from 'react';
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
  CheckCircle2,
  XCircle,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type {
  SmartImportCandidate,
  ImportProgress,
  ReservationData,
  ImportPhase,
  CandidateImportResult,
} from '../types';
import { IMPORT_PHASE_LABELS } from '../types';

// Map Gmail extraction types → artifact-ingest artifact_type overrides
const RESERVATION_TO_ARTIFACT_TYPE: Record<string, string> = {
  flight: 'flight',
  lodging: 'hotel',
  ground_transport: 'generic_document',
  event_ticket: 'event_ticket',
  sports_ticket: 'event_ticket',
  restaurant_reservation: 'restaurant_reservation',
  rail_bus_ferry: 'generic_document',
  conference_registration: 'generic_document',
  generic_itinerary_item: 'generic_document',
  // Legacy aliases (pre-normalization)
  dining_reservation: 'restaurant_reservation',
  rail_ticket: 'generic_document',
};

export interface ReviewCandidatesProps {
  candidates: SmartImportCandidate[];
  tripId?: string;
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
  conference_registration: { icon: CalendarCheck, color: 'text-violet-500', label: 'Conference' },
  generic_itinerary_item: { icon: Map, color: 'text-slate-500', label: 'Itinerary' },
};

type FilterTab =
  | 'all'
  | 'flight'
  | 'lodging'
  | 'event_ticket'
  | 'sports_ticket'
  | 'restaurant_reservation'
  | 'rail_bus_ferry'
  | 'ground_transport';

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'flight', label: 'Flights' },
  { key: 'lodging', label: 'Lodging' },
  { key: 'event_ticket', label: 'Events' },
  { key: 'sports_ticket', label: 'Sports' },
  { key: 'restaurant_reservation', label: 'Dining' },
  { key: 'rail_bus_ferry', label: 'Rail/Ferry' },
  { key: 'ground_transport', label: 'Transport' },
];

/** Progress phase indicator with labeled steps */
const ImportPhaseBar: React.FC<{ progress: ImportProgress }> = ({ progress }) => {
  const steps: { key: ImportPhase; label: string }[] = [
    { key: 'parsing', label: 'Parsing' },
    { key: 'validating', label: 'Validating' },
    { key: 'importing', label: 'Importing' },
    { key: 'done', label: 'Done' },
  ];

  const currentIndex = steps.findIndex(s => s.key === progress.phase);
  const isFailed = progress.phase === 'failed';

  return (
    <div
      className="pt-2 space-y-2"
      role="progressbar"
      aria-label="Import progress"
      aria-valuenow={progress.completed}
      aria-valuemax={progress.total}
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{IMPORT_PHASE_LABELS[progress.phase]}</span>
        <span>
          {progress.completed}/{progress.total} items
          {progress.failed > 0 && (
            <span className="text-red-400 ml-2">{progress.failed} failed</span>
          )}
        </span>
      </div>
      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const isComplete = !isFailed && currentIndex > idx;
          const isCurrent = !isFailed && currentIndex === idx;
          return (
            <div key={step.key} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isComplete
                    ? 'bg-green-500'
                    : isCurrent
                      ? 'bg-primary'
                      : isFailed && idx === currentIndex
                        ? 'bg-red-500'
                        : 'bg-muted'
                }`}
                style={
                  isCurrent && progress.total > 0
                    ? {
                        background: `linear-gradient(to right, hsl(var(--primary)) ${Math.round((progress.completed / progress.total) * 100)}%, hsl(var(--muted)) ${Math.round((progress.completed / progress.total) * 100)}%)`,
                      }
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
      {/* Step labels */}
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const isCurrent = !isFailed && currentIndex === idx;
          return (
            <span
              key={step.key}
              className={`flex-1 text-center text-[10px] ${isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'}`}
            >
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Per-item result badges for partial failure UI */
const CandidateResultBadge: React.FC<{ result: CandidateImportResult }> = ({ result }) => {
  if (result.status === 'succeeded') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        Imported
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] text-red-500"
      title={result.errorMessage}
    >
      <XCircle className="h-3 w-3" />
      Failed
    </span>
  );
};

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
          const score = data._relevance_score;
          // Auto-deselect items with low trip relevance (below 0.4)
          if (score !== undefined && typeof score === 'number' && score < 0.4) return false;
          return true;
        })
        .map(c => c.id),
    );
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [failedCandidateIds, setFailedCandidateIds] = useState<Set<string>>(new Set());
  const [candidateResults, setCandidateResults] = useState<Map<string, CandidateImportResult>>(
    new Map(),
  );

  const visibleCandidates = useMemo(() => {
    if (activeFilter === 'all') return candidates;
    return candidates.filter(c => c.reservation_data?.type === activeFilter);
  }, [candidates, activeFilter]);

  // Only show tabs that have at least one candidate
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

  const ingestCandidate = async (candidate: SmartImportCandidate): Promise<string> => {
    const resData: ReservationData = candidate.reservation_data || {};
    const reservationType = resData.type;
    const artifactTypeOverride = reservationType
      ? RESERVATION_TO_ARTIFACT_TYPE[reservationType]
      : undefined;

    const { data, error } = await supabase.functions.invoke('artifact-ingest', {
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

    if (error || !data?.success) {
      throw new Error(error?.message || data?.error || 'artifact-ingest returned failure');
    }

    return candidate.id;
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    setImportProgress(null);
    setCandidateResults(new Map());
    try {
      const accepted = candidates.filter(c => selectedIds.has(c.id));
      const rejected = candidates.filter(c => !selectedIds.has(c.id));

      let persistedCount = 0;
      let failedCount = 0;
      const succeededIds: string[] = [];
      const newFailedIds: string[] = [];
      const results = new Map<string, CandidateImportResult>();

      if (tripId && accepted.length > 0) {
        const progress: ImportProgress = {
          phase: 'validating',
          total: accepted.length,
          completed: 0,
          succeeded: 0,
          failed: 0,
          failedCandidateIds: [],
        };
        setImportProgress({ ...progress });

        // Transition to importing phase
        progress.phase = 'importing';
        setImportProgress({ ...progress });

        const ingestResults = await Promise.allSettled(
          accepted.map(async candidate => {
            const id = await ingestCandidate(candidate);
            progress.completed++;
            progress.succeeded++;
            results.set(candidate.id, { candidateId: candidate.id, status: 'succeeded' });
            setCandidateResults(new Map(results));
            setImportProgress({ ...progress });
            return id;
          }),
        );

        for (let i = 0; i < ingestResults.length; i++) {
          const result = ingestResults[i];
          if (result.status === 'fulfilled') {
            succeededIds.push(accepted[i].id);
            persistedCount++;
          } else {
            failedCount++;
            newFailedIds.push(accepted[i].id);
            const errorMsg =
              result.reason instanceof Error ? result.reason.message : 'Unknown error';
            results.set(accepted[i].id, {
              candidateId: accepted[i].id,
              status: 'failed',
              errorMessage: errorMsg,
            });
            progress.completed++;
            progress.failed++;
            progress.failedCandidateIds.push(accepted[i].id);
            setCandidateResults(new Map(results));
            setImportProgress({ ...progress });
          }
        }

        // Final phase
        progress.phase = failedCount > 0 ? 'failed' : 'done';
        setImportProgress({ ...progress });

        if (succeededIds.length > 0) {
          await supabase
            .from('smart_import_candidates')
            .update({ status: 'accepted' })
            .in('id', succeededIds);
        }
      }

      // Mark rejected candidates
      if (rejected.length > 0) {
        await supabase
          .from('smart_import_candidates')
          .update({ status: 'rejected' })
          .in(
            'id',
            rejected.map(c => c.id),
          );
      }

      setFailedCandidateIds(new Set(newFailedIds));

      if (failedCount > 0) {
        toast.warning(
          `${persistedCount} of ${accepted.length} item${accepted.length !== 1 ? 's' : ''} saved.`,
          {
            description: `${failedCount} item${failedCount !== 1 ? 's' : ''} failed. You can retry them.`,
          },
        );
      } else if (accepted.length > 0) {
        toast.success(
          `Added ${accepted.length} item${accepted.length !== 1 ? 's' : ''} to your trip`,
        );
        await onAccept(accepted);
      }
    } catch (error: unknown) {
      toast.error('Failed to save imported items', { description: (error as Error)?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryFailed = async () => {
    if (failedCandidateIds.size === 0) return;
    setIsSubmitting(true);

    const toRetry = candidates.filter(c => failedCandidateIds.has(c.id));
    let retrySucceeded = 0;
    const stillFailed: string[] = [];
    const results = new Map(candidateResults);

    for (const candidate of toRetry) {
      try {
        await ingestCandidate(candidate);
        retrySucceeded++;
        results.set(candidate.id, { candidateId: candidate.id, status: 'succeeded' });
        setCandidateResults(new Map(results));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        stillFailed.push(candidate.id);
        results.set(candidate.id, {
          candidateId: candidate.id,
          status: 'failed',
          errorMessage: errorMsg,
        });
        setCandidateResults(new Map(results));
      }
    }

    if (retrySucceeded > 0) {
      const retriedIds = toRetry.filter(c => !stillFailed.includes(c.id)).map(c => c.id);
      await supabase
        .from('smart_import_candidates')
        .update({ status: 'accepted' })
        .in('id', retriedIds);
    }

    setFailedCandidateIds(new Set(stillFailed));

    if (stillFailed.length === 0) {
      toast.success(`All ${retrySucceeded} item${retrySucceeded !== 1 ? 's' : ''} saved on retry`);
      await onAccept(candidates.filter(c => selectedIds.has(c.id)));
    } else {
      toast.warning(`${retrySucceeded} succeeded, ${stillFailed.length} still failing`);
    }

    setIsSubmitting(false);
  };

  // Empty state for no importable items
  if (!candidates || candidates.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center p-8 text-center space-y-4"
        role="status"
        aria-label="No importable items found"
      >
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-medium">No new reservations found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            We couldn't find any travel confirmations for this trip in your recent emails, or they
            have already been imported.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onCancel}
          className="min-h-[44px]"
          aria-label="Go back to previous screen"
        >
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
          <span aria-live="polite">
            {selectedIds.size} of {candidates.length} selected
          </span>
        </div>
      </div>

      {/* Type filter tabs */}
      {tabsWithData.length > 2 && (
        <div
          className="flex gap-1 flex-wrap"
          role="tablist"
          aria-label="Filter by reservation type"
        >
          {tabsWithData.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeFilter === tab.key}
              aria-label={`Filter by ${tab.label}`}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3 py-1.5 min-h-[44px] rounded-full text-xs font-medium transition-colors ${
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
          className="text-primary hover:underline min-h-[44px] px-1"
          disabled={visibleSelectedCount === visibleCandidates.length}
          aria-label={`Select all${activeFilter !== 'all' ? ' visible' : ''} items`}
        >
          Select All{activeFilter !== 'all' ? ' Visible' : ''}
        </button>
        <span className="text-muted-foreground">·</span>
        <button
          onClick={deselectAllVisible}
          className="text-muted-foreground hover:underline min-h-[44px] px-1"
          disabled={visibleSelectedCount === 0}
          aria-label={`Deselect all${activeFilter !== 'all' ? ' visible' : ''} items`}
        >
          Deselect All{activeFilter !== 'all' ? ' Visible' : ''}
        </button>
        {activeFilter !== 'all' && (
          <span className="text-muted-foreground ml-1">
            ({visibleSelectedCount} of {visibleCandidates.length} visible selected)
          </span>
        )}
      </div>

      <div
        className="space-y-3 max-h-[60vh] overflow-y-auto pr-2"
        role="list"
        aria-label="Import candidates"
      >
        {visibleCandidates.map(candidate => {
          const type = (candidate.reservation_data?.type as string) || 'unknown';
          const config = typeConfig[type] || { icon: Plane, color: 'text-gray-500', label: 'Item' };
          const Icon = config.icon;

          const data: ReservationData = candidate.reservation_data || {};

          let title = 'Unknown Reservation';
          let subtitle = '';

          if (type === 'flight') {
            const operatorName = data.airline_name || data.booking_source || data.airline_code;
            const flightId = data.flight_number || data.tail_number || '';
            title = `${operatorName || 'Flight'} ${flightId}`.trim();
            subtitle = `${data.departure_city || data.departure_airport_code || ''} → ${data.arrival_city || data.arrival_airport_code || ''}`;
          } else if (type === 'lodging') {
            title = (data.property_name as string) || 'Stay';
            subtitle = data.city || data.address || '';
          } else if (type === 'ground_transport') {
            title = data.provider_name || 'Ground Transport';
            subtitle = `${data.pickup_location || ''} to ${data.dropoff_location || ''}`;
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
          const relevanceScore = data._relevance_score;
          const relevanceReason = data._relevance_reason;
          const isCancellation = data.is_cancellation === true;
          const isModification = data.is_modification === true;
          const candidateResult = candidateResults.get(candidate.id);

          return (
            <Card
              key={candidate.id}
              role="listitem"
              className={`cursor-pointer transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              } ${isCancellation ? 'opacity-60' : ''}`}
              onClick={() => toggleSelection(candidate.id)}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className="mt-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(candidate.id)}
                    className="data-[state=checked]:bg-primary"
                    aria-label={`Select ${title}`}
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
                    {candidateResult && <CandidateResultBadge result={candidateResult} />}
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
                      Ref: {String(data.confirmation_code)}
                    </p>
                  )}
                  {typeof relevanceScore === 'number' && (
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[80px]"
                        role="progressbar"
                        aria-label="Relevance score"
                        aria-valuenow={Math.round(relevanceScore * 100)}
                        aria-valuemax={100}
                      >
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
                      {typeof relevanceReason === 'string' && (
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

      {/* Progress indicator during submission — now with phase steps */}
      {isSubmitting && importProgress && importProgress.total > 0 && (
        <ImportPhaseBar progress={importProgress} />
      )}

      {/* Partial failure summary after submission */}
      {!isSubmitting && failedCandidateIds.size > 0 && (
        <div
          className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3"
          role="alert"
        >
          <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {failedCandidateIds.size} item{failedCandidateIds.size !== 1 ? 's' : ''} failed to
              import
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You can retry the failed items or dismiss them.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t mt-6">
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="min-h-[44px]"
          aria-label="Cancel import"
        >
          Cancel
        </Button>
        {failedCandidateIds.size > 0 && !isSubmitting && (
          <Button
            variant="outline"
            onClick={handleRetryFailed}
            className="min-w-[100px] min-h-[44px]"
            aria-label={`Retry ${failedCandidateIds.size} failed items`}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry {failedCandidateIds.size} Failed
          </Button>
        )}
        <Button
          onClick={handleAccept}
          disabled={selectedIds.size === 0 || isSubmitting}
          className="min-w-[120px] min-h-[44px]"
          aria-label={`Add ${selectedIds.size} selected items to trip`}
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
