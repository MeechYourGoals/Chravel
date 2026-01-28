import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Upload,
  FileText,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  parseICSFile,
  ICSParsedEvent,
  ICSParseResult,
  findDuplicateEvents,
} from '@/utils/calendarImport';
import { calendarService, TripEvent } from '@/services/calendarService';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ICSImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  existingEvents: TripEvent[];
  onImportComplete?: () => void;
}

type ImportState = 'idle' | 'parsing' | 'preview' | 'importing' | 'complete';

export const ICSImportModal: React.FC<ICSImportModalProps> = ({
  isOpen,
  onClose,
  tripId,
  existingEvents,
  onImportComplete,
}) => {
  const [state, setState] = useState<ImportState>('idle');
  const [parseResult, setParseResult] = useState<ICSParseResult | null>(null);
  const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState({ imported: 0, skipped: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setState('idle');
    setParseResult(null);
    setDuplicateIndices(new Set());
    setImportProgress({ imported: 0, skipped: 0, failed: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setState('parsing');

      const result = await parseICSFile(file);
      setParseResult(result);

      if (!result.isValid || result.events.length === 0) {
        setState('idle');
        toast.error('Invalid ICS file', {
          description: result.errors[0] || 'No events found in file',
        });
        return;
      }

      // Check for duplicates
      const duplicates = findDuplicateEvents(
        result.events,
        existingEvents.map(e => ({
          start_time: e.start_time,
          end_time: e.end_time,
          title: e.title,
        })),
      );
      setDuplicateIndices(duplicates);

      setState('preview');
    },
    [existingEvents],
  );

  const handleImport = useCallback(async () => {
    if (!parseResult) return;

    setState('importing');
    const progress = { imported: 0, skipped: 0, failed: 0 };

    for (let i = 0; i < parseResult.events.length; i++) {
      const event = parseResult.events[i];

      // Skip duplicates
      if (duplicateIndices.has(i)) {
        progress.skipped++;
        setImportProgress({ ...progress });
        continue;
      }

      try {
        // Create event using calendarService
        let endTime: string | undefined;
        if (event.endTime && event.endTime.getTime() !== event.startTime.getTime()) {
          endTime = event.endTime.toISOString();
        } else if (event.isAllDay) {
          // For all-day events, set end time to end of day
          const endOfDay = new Date(event.startTime);
          endOfDay.setHours(23, 59, 59, 999);
          endTime = endOfDay.toISOString();
        }

        await calendarService.createEvent({
          trip_id: tripId,
          title: event.title,
          description: event.description,
          start_time: event.startTime.toISOString(),
          end_time: endTime,
          location: event.location,
          event_category: 'other',
          include_in_itinerary: true,
          source_type: 'manual',
          source_data: { imported_from: 'ics', original_uid: event.uid },
        });

        progress.imported++;
      } catch (error) {
        console.error('Failed to import event:', event.title, error);
        progress.failed++;
      }

      setImportProgress({ ...progress });
    }

    setState('complete');

    // Show summary toast
    if (progress.imported > 0) {
      let description = `${progress.imported} event${progress.imported !== 1 ? 's' : ''} imported`;
      if (progress.skipped > 0) {
        description += `, ${progress.skipped} duplicate${progress.skipped !== 1 ? 's' : ''} skipped`;
      }
      if (progress.failed > 0) {
        description += `, ${progress.failed} failed`;
      }
      toast.success('Import complete', { description });
    } else if (progress.skipped > 0) {
      toast.info('No new events', {
        description: `All ${progress.skipped} event${progress.skipped !== 1 ? 's' : ''} were already in your calendar`,
      });
    } else {
      toast.error('Import failed', {
        description: 'No events could be imported',
      });
    }

    onImportComplete?.();
  }, [parseResult, duplicateIndices, tripId, onImportComplete]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files?.[0];
      if (file && file.name.toLowerCase().endsWith('.ics')) {
        // Create a synthetic event for the file handler
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        if (fileInputRef.current) {
          fileInputRef.current.files = dataTransfer.files;
          handleFileSelect({ target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>);
        }
      } else {
        toast.error('Invalid file', { description: 'Please drop an .ics file' });
      }
    },
    [handleFileSelect],
  );

  const eventsToImport = parseResult?.events.filter((_, i) => !duplicateIndices.has(i)).length ?? 0;
  const duplicateCount = duplicateIndices.size;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Calendar Events
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Idle state - file upload */}
          {state === 'idle' && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                  'hover:border-primary/50 hover:bg-primary/5',
                  'border-border bg-muted/30',
                )}
              >
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop an .ics file here, or click to browse
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px]"
                >
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics,text/calendar"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">V1 Limitations</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Recurring events (RRULE) are imported as single occurrences</li>
                        <li>Reminders and attendees are not imported</li>
                        <li>Events are added to the current trip calendar</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Parsing state */}
          {state === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground">Parsing calendar file...</p>
            </div>
          )}

          {/* Preview state */}
          {state === 'preview' && parseResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">
                    {eventsToImport} event{eventsToImport !== 1 ? 's' : ''} to import
                  </p>
                  {duplicateCount > 0 && (
                    <p className="text-sm text-amber-500">
                      {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''} will be skipped
                    </p>
                  )}
                </div>
                <Calendar className="w-8 h-8 text-primary" />
              </div>

              {/* Warnings */}
              {parseResult.errors.length > 0 && (
                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-500 mb-1">Warnings</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          {parseResult.errors.slice(0, 5).map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                          {parseResult.errors.length > 5 && (
                            <li>...and {parseResult.errors.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Event list */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {parseResult.events.map((event, index) => {
                  const isDuplicate = duplicateIndices.has(index);
                  return (
                    <Card
                      key={event.uid}
                      className={cn('transition-opacity', isDuplicate && 'opacity-50')}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{event.title}</p>
                              {isDuplicate && (
                                <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">
                                  Duplicate
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {format(
                                  event.startTime,
                                  event.isAllDay ? 'MMM d, yyyy' : 'MMM d, h:mm a',
                                )}
                              </span>
                              {event.location && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Importing state */}
          {state === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground mb-2">Importing events...</p>
              <p className="text-sm text-muted-foreground">
                {importProgress.imported + importProgress.skipped + importProgress.failed} /{' '}
                {parseResult?.events.length ?? 0}
              </p>
            </div>
          )}

          {/* Complete state */}
          {state === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
              <p className="font-medium text-lg mb-2">Import Complete</p>
              <div className="text-sm text-muted-foreground text-center space-y-1">
                <p>
                  {importProgress.imported} event{importProgress.imported !== 1 ? 's' : ''} imported
                </p>
                {importProgress.skipped > 0 && (
                  <p>
                    {importProgress.skipped} duplicate{importProgress.skipped !== 1 ? 's' : ''}{' '}
                    skipped
                  </p>
                )}
                {importProgress.failed > 0 && (
                  <p className="text-red-500">{importProgress.failed} failed</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          {state === 'preview' && (
            <>
              <Button variant="outline" onClick={resetState} className="flex-1 min-h-[44px]">
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={eventsToImport === 0}
                className="flex-1 min-h-[44px]"
              >
                Import {eventsToImport} Event{eventsToImport !== 1 ? 's' : ''}
              </Button>
            </>
          )}
          {state === 'complete' && (
            <Button onClick={handleClose} className="flex-1 min-h-[44px]">
              Done
            </Button>
          )}
          {(state === 'idle' || state === 'parsing') && (
            <Button variant="outline" onClick={handleClose} className="flex-1 min-h-[44px]">
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
