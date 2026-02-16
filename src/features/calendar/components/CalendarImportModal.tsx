import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Upload,
  FileText,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Image,
  Type,
  Sparkles,
  Globe,
  Link,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ICSParsedEvent, findDuplicateEvents } from '@/utils/calendarImport';
import {
  parseCalendarFile,
  parseTextWithAI,
  parseURLSchedule,
  SmartParseResult,
  getFormatLabel,
} from '@/utils/calendarImportParsers';
import { calendarService, TripEvent } from '@/services/calendarService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { tripKeys } from '@/lib/queryKeys';

interface CalendarImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  existingEvents: TripEvent[];
  onImportComplete?: () => void;
  /** Pre-loaded result from background import — opens directly in preview */
  pendingResult?: SmartParseResult | null;
  /** Called when clearing a pending result */
  onClearPendingResult?: () => void;
  /** Called to start a background URL import (closes modal immediately) */
  onStartBackgroundImport?: (url: string) => void;
}

type ImportState = 'idle' | 'parsing' | 'preview' | 'importing' | 'complete';

const ACCEPTED_FILE_TYPES =
  '.ics,.csv,.xlsx,.xls,.pdf,image/jpeg,image/png,image/webp,text/calendar,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

const FORMAT_BADGES = [
  { label: 'ICS', icon: Calendar },
  { label: 'CSV', icon: FileSpreadsheet },
  { label: 'Excel', icon: FileSpreadsheet },
  { label: 'PDF', icon: FileText },
  { label: 'Image', icon: Image },
  { label: 'URL', icon: Globe },
];

export const CalendarImportModal: React.FC<CalendarImportModalProps> = ({
  isOpen,
  onClose,
  tripId,
  existingEvents,
  onImportComplete,
  pendingResult: externalPendingResult,
  onClearPendingResult,
  onStartBackgroundImport,
}) => {
  const [state, setState] = useState<ImportState>('idle');
  const [parseResult, setParseResult] = useState<SmartParseResult | null>(null);
  const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState({ imported: 0, skipped: 0, failed: 0 });
  const [importingProgress, setImportingProgress] = useState({ completed: 0, total: 0 });
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [parsingSource, setParsingSource] = useState<'file' | 'text' | 'url'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const resetState = useCallback(() => {
    setState('idle');
    setParseResult(null);
    setDuplicateIndices(new Set());
    setImportProgress({ imported: 0, skipped: 0, failed: 0 });
    setShowPasteInput(false);
    setPasteText('');
    setUrlInput('');
    setParsingSource('file');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClearPendingResult?.();
    onClose();
  }, [resetState, onClose, onClearPendingResult]);

  const processParseResult = useCallback(
    (result: SmartParseResult) => {
      setParseResult(result);

      if (!result.isValid || result.events.length === 0) {
        setState('idle');
        toast.error('No events found', {
          description: result.errors[0] || 'Could not extract any calendar events from this file',
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

  // Load external pending result (from background import) when modal opens
  React.useEffect(() => {
    if (isOpen && externalPendingResult && externalPendingResult.isValid && externalPendingResult.events.length > 0) {
      processParseResult(externalPendingResult);
    }
  }, [isOpen, externalPendingResult, processParseResult]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setParsingSource('file');
      setState('parsing');
      const result = await parseCalendarFile(file);
      processParseResult(result);
    },
    [processParseResult],
  );

  const handlePasteSubmit = useCallback(async () => {
    if (!pasteText.trim()) return;

    setParsingSource('text');
    setState('parsing');
    const result = await parseTextWithAI(pasteText.trim());
    processParseResult(result);
  }, [pasteText, processParseResult]);

  const isValidUrl = useCallback((str: string) => {
    try {
      const url = new URL(str);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }, []);

  const handleUrlImport = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    // If background import handler is available, use it (close modal, import in background)
    if (onStartBackgroundImport) {
      onStartBackgroundImport(trimmed);
      resetState();
      onClose();
      return;
    }

    // Fallback: synchronous import (kept for safety)
    setParsingSource('url');
    setState('parsing');
    const result = await parseURLSchedule(trimmed);
    processParseResult(result);
  }, [urlInput, processParseResult, onStartBackgroundImport, resetState, onClose]);

  const handleImport = useCallback(async () => {
    if (!parseResult) return;

    setState('importing');

    // Build array of non-duplicate events upfront
    const eventsToInsert = parseResult.events
      .filter((_, i) => !duplicateIndices.has(i))
      .map(event => {
        let endTime: string | undefined;
        if (event.endTime && event.endTime.getTime() !== event.startTime.getTime()) {
          endTime = event.endTime.toISOString();
        } else if (event.isAllDay) {
          const endOfDay = new Date(event.startTime);
          endOfDay.setHours(23, 59, 59, 999);
          endTime = endOfDay.toISOString();
        }

        return {
          trip_id: tripId,
          title: event.title,
          description: event.description,
          start_time: event.startTime.toISOString(),
          end_time: endTime,
          location: event.location,
          event_category: 'other' as const,
          include_in_itinerary: true,
          source_type: 'manual',
          source_data: {
            imported_from: parseResult.sourceFormat,
            original_uid: event.uid,
          },
        };
      });

    const skipped = duplicateIndices.size;
    setImportProgress({ imported: 0, skipped, failed: 0 });
    setImportingProgress({ completed: 0, total: eventsToInsert.length });

    let imported = 0;
    let failed = 0;

    try {
      if (eventsToInsert.length > 0) {
        // Dynamic timeout: 30s base + 1s per event beyond 10, capped at 120s
        const timeoutMs = Math.min(30000 + Math.max(0, eventsToInsert.length - 10) * 1000, 120000);
        const importPromise = calendarService.bulkCreateEvents(eventsToInsert, (completed, total) => {
          setImportingProgress({ completed, total });
        });
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Import timed out after ${Math.round(timeoutMs / 1000)} seconds`)), timeoutMs);
        });

        const result = await Promise.race([importPromise, timeoutPromise]);
        imported = result.imported;
        failed = result.failed;
      }
    } catch (error) {
      console.error('Bulk import failed:', error);
      // On timeout or error, report whatever progress we had
      failed = eventsToInsert.length - imported;
    }

    setImportProgress({ imported, skipped, failed });
    setState('complete');

    if (imported > 0) {
      let description = `${imported} event${imported !== 1 ? 's' : ''} imported`;
      if (skipped > 0) {
        description += `, ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped`;
      }
      if (failed > 0) {
        description += `, ${failed} failed`;
      }
      toast.success('Import complete', { description });
    } else if (skipped > 0) {
      toast.info('No new events', {
        description: `All ${skipped} event${skipped !== 1 ? 's' : ''} were already in your calendar`,
      });
    } else {
      toast.error('Import failed', { description: 'No events could be imported' });
    }

    // Force-invalidate cache before notifying parent — ensures UI updates regardless of parent implementation
    try {
      await queryClient.invalidateQueries({ queryKey: tripKeys.calendar(tripId) });
    } catch (cacheError) {
      console.warn('Failed to invalidate calendar cache:', cacheError);
    }

    if (onImportComplete) {
      try {
        await onImportComplete();
      } catch (refreshError) {
        console.warn('Failed to refresh events after import:', refreshError);
      }
    }
  }, [parseResult, duplicateIndices, tripId, onImportComplete, queryClient]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files?.[0];
      if (file) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        if (fileInputRef.current) {
          fileInputRef.current.files = dataTransfer.files;
          handleFileSelect({
            target: fileInputRef.current,
          } as React.ChangeEvent<HTMLInputElement>);
        }
      }
    },
    [handleFileSelect],
  );

  const eventsToImport = parseResult?.events.filter((_, i) => !duplicateIndices.has(i)).length ?? 0;
  const duplicateCount = duplicateIndices.size;
  const hasImportFailure = importProgress.imported === 0 && importProgress.failed > 0;

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
          {/* ── Idle State ── */}
          {state === 'idle' && (
            <div className="space-y-4">
              {/* Drop zone */}
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
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop a file here, or click to browse
                </p>

                {/* Format badges */}
                <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                  {FORMAT_BADGES.map(({ label, icon: Icon }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                  ))}
                </div>

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
                  accept={ACCEPTED_FILE_TYPES}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* URL import section */}
                <div className="mt-4 pt-4 border-t border-border/50 w-full">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1.5">
                    <Link className="w-3.5 h-3.5" />
                    or import from a URL
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="Paste a schedule URL (team's site, tour dates, etc.)"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      className="flex-1 text-sm rounded-lg h-11 border-amber-500/60 focus:border-amber-400"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && isValidUrl(urlInput.trim())) {
                          handleUrlImport();
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUrlImport}
                      disabled={!urlInput.trim() || !isValidUrl(urlInput.trim())}
                      className="h-11 shrink-0"
                    >
                      <Globe className="w-4 h-4 mr-1.5" />
                      Import
                    </Button>
                  </div>
                </div>
              </div>

              {/* Paste schedule toggle */}
              <div className="flex items-center gap-3 px-1">
                <Switch
                  checked={showPasteInput}
                  onCheckedChange={setShowPasteInput}
                  id="paste-toggle"
                />
                <label
                  htmlFor="paste-toggle"
                  className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer"
                >
                  <Type className="w-4 h-4" />
                  Paste schedule text instead
                </label>
              </div>

              {showPasteInput && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Paste your schedule here — email text, itinerary, list of events..."
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    className="min-h-[120px] rounded-xl"
                  />
                  <Button
                    onClick={handlePasteSubmit}
                    disabled={!pasteText.trim()}
                    className="w-full min-h-[44px]"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Extract Events with AI
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Parsing State ── */}
          {state === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground">
                {parsingSource === 'url'
                  ? 'Scanning website for schedule...'
                  : parsingSource === 'text'
                    ? 'AI is extracting events from text...'
                    : parseResult?.sourceFormat === 'pdf' || parseResult?.sourceFormat === 'image'
                      ? 'AI is extracting events...'
                      : 'Parsing calendar file...'}
              </p>
            </div>
          )}

          {/* ── Preview State ── */}
          {state === 'preview' && parseResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">
                    {eventsToImport} event{eventsToImport !== 1 ? 's' : ''} to import
                  </p>
                  <div className="flex items-center flex-wrap gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      {getFormatLabel(parseResult.sourceFormat)}
                    </span>
                    {duplicateCount > 0 && (
                      <span className="text-xs text-amber-500">
                        {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''} skipped
                      </span>
                    )}
                    {parseResult.urlMeta && parseResult.urlMeta.eventsFiltered > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({parseResult.urlMeta.eventsFiltered} past event
                        {parseResult.urlMeta.eventsFiltered !== 1 ? 's' : ''} excluded)
                      </span>
                    )}
                  </div>
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
                  const confidence = parseResult.confidenceScores?.[index];
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
                            {/* Confidence for AI-parsed events */}
                            {confidence !== undefined && confidence < 0.9 && (
                              <div className="mt-1">
                                <span className="text-xs text-muted-foreground/70">
                                  Confidence: {Math.round(confidence * 100)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Importing State ── */}
          {state === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground mb-2">
                {importingProgress.total > 0
                  ? `Importing ${importingProgress.completed}/${importingProgress.total} events...`
                  : `Importing ${eventsToImport} event${eventsToImport !== 1 ? 's' : ''}...`}
              </p>
              <p className="text-xs text-muted-foreground">
                {importingProgress.total > 0 && importingProgress.completed > 0
                  ? 'Almost there...'
                  : 'This should only take a moment'}
              </p>
            </div>
          )}

          {/* ── Complete State ── */}
          {state === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12">
              {hasImportFailure ? (
                <>
                  <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                  <p className="font-medium text-lg mb-2">Import Failed</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                  <p className="font-medium text-lg mb-2">Import Complete</p>
                </>
              )}
              <div className="text-sm text-muted-foreground text-center space-y-1">
                {importProgress.imported > 0 && (
                  <p>
                    {importProgress.imported} event{importProgress.imported !== 1 ? 's' : ''}{' '}
                    imported
                  </p>
                )}
                {importProgress.skipped > 0 && (
                  <p>
                    {importProgress.skipped} duplicate{importProgress.skipped !== 1 ? 's' : ''}{' '}
                    skipped
                  </p>
                )}
                {importProgress.failed > 0 && (
                  <p className="text-red-500">
                    {importProgress.failed} event{importProgress.failed !== 1 ? 's' : ''} failed to
                    import
                  </p>
                )}
                {hasImportFailure && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Please try again or contact support if the issue persists.
                  </p>
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
