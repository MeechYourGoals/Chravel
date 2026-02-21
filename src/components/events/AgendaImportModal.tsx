/**
 * AgendaImportModal
 *
 * Modal for importing agenda sessions. Full parity with Calendar Import:
 * Drag-and-drop, file picker, URL, paste text. Supports ICS, CSV, Excel, PDF, Image.
 */

import React, { useState, useCallback } from 'react';
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
  Image,
  Type,
  Sparkles,
  Globe,
  Link,
  User,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  parseAgendaFile,
  parseAgendaText,
  parseAgendaURL,
  AgendaParseResult,
  ParsedAgendaSession,
  findDuplicateAgendaSessions,
} from '@/utils/agendaImportParsers';
import { toast } from 'sonner';
import { useSmartImportDropzone } from '@/hooks/useSmartImportDropzone';

interface AgendaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  existingSessions?: Array<
    Pick<ParsedAgendaSession, 'title' | 'session_date' | 'start_time' | 'location'>
  >;
  onImportSessions: (sessions: ParsedAgendaSession[]) => Promise<void>;
  /** Bulk import with progress tracking — preferred for large batches */
  onBulkImportSessions?: (
    sessions: ParsedAgendaSession[],
    onProgress?: (current: number, total: number) => void,
  ) => Promise<{ imported: number; failed: number }>;
  /** Pre-loaded result from background import */
  pendingResult?: AgendaParseResult | null;
  onClearPendingResult?: () => void;
  /** Background URL import handler */
  onStartBackgroundImport?: (url: string) => void;
  onLineupUpdate?: (speakerNames: string[]) => void;
}

type ImportState = 'idle' | 'parsing' | 'preview' | 'importing' | 'complete';

const FORMAT_BADGES = [
  { label: 'ICS', icon: Calendar },
  { label: 'CSV', icon: FileSpreadsheet },
  { label: 'Excel', icon: FileSpreadsheet },
  { label: 'PDF', icon: FileText },
  { label: 'Image', icon: Image },
  { label: 'URL', icon: Globe },
];

function getFormatLabel(format: AgendaParseResult['sourceFormat']): string {
  switch (format) {
    case 'ics':
      return 'ICS Calendar';
    case 'csv':
      return 'CSV Spreadsheet';
    case 'excel':
      return 'Excel Spreadsheet';
    case 'pdf':
      return 'PDF Document';
    case 'image':
      return 'Image';
    case 'url':
      return 'Website URL';
    case 'text':
      return 'Pasted Text';
    default:
      return 'File';
  }
}

export const AgendaImportModal: React.FC<AgendaImportModalProps> = ({
  isOpen,
  onClose,
  eventId,
  existingSessions = [],
  onImportSessions,
  onBulkImportSessions,
  pendingResult: externalPendingResult,
  onClearPendingResult,
  onStartBackgroundImport,
  onLineupUpdate,
}) => {
  const [state, setState] = useState<ImportState>('idle');
  const [parseResult, setParseResult] = useState<AgendaParseResult | null>(null);
  const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState({ imported: 0, skipped: 0, failed: 0 });
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [parsingSource, setParsingSource] = useState<'file' | 'text' | 'url'>('file');

  const processParseResult = useCallback(
    (result: AgendaParseResult) => {
      setParseResult(result);
      if (!result.isValid || result.sessions.length === 0) {
        setState('idle');
        toast.error('No sessions found', {
          description: result.errors[0] || 'Could not extract any agenda sessions',
        });
        return;
      }
      const duplicates = findDuplicateAgendaSessions(result.sessions, existingSessions);
      setDuplicateIndices(duplicates);
      setState('preview');
    },
    [existingSessions],
  );

  const processFile = useCallback(
    async (file: File) => {
      setParsingSource('file');
      setState('parsing');
      const result = await parseAgendaFile(file);
      processParseResult(result);
    },
    [processParseResult],
  );

  const { getRootProps, getInputProps, isDragActive } = useSmartImportDropzone({
    onFileSelected: processFile,
    disabled: state === 'parsing' || state === 'importing',
  });

  const resetState = useCallback(() => {
    setState('idle');
    setParseResult(null);
    setDuplicateIndices(new Set());
    setImportProgress({ imported: 0, skipped: 0, failed: 0 });
    setBulkProgress(null);
    setShowPasteInput(false);
    setPasteText('');
    setUrlInput('');
    setParsingSource('file');
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClearPendingResult?.();
    onClose();
  }, [resetState, onClose, onClearPendingResult]);

  // Load external pending result when modal opens
  React.useEffect(() => {
    if (isOpen && externalPendingResult?.isValid && externalPendingResult.sessions.length > 0) {
      processParseResult(externalPendingResult);
    }
  }, [isOpen, externalPendingResult, processParseResult]);

  const handlePasteSubmit = useCallback(async () => {
    if (!pasteText.trim()) return;
    setParsingSource('text');
    setState('parsing');
    const result = await parseAgendaText(pasteText.trim());
    processParseResult(result);
  }, [pasteText, processParseResult]);

  const isValidUrl = useCallback((str: string) => {
    try {
      const u = new URL(str);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }, []);

  const handleUrlImport = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    if (onStartBackgroundImport) {
      onStartBackgroundImport(trimmed);
      resetState();
      onClose();
      return;
    }

    setParsingSource('url');
    setState('parsing');
    const result = await parseAgendaURL(trimmed);
    processParseResult(result);
  }, [urlInput, processParseResult, onStartBackgroundImport, resetState, onClose]);

  const handleImport = useCallback(async () => {
    if (!parseResult) return;
    setState('importing');
    setBulkProgress(null);

    const sessionsToImport = parseResult.sessions.filter((_, i) => !duplicateIndices.has(i));
    const skipped = duplicateIndices.size;
    let imported = 0;
    let failed = 0;

    try {
      if (sessionsToImport.length > 0) {
        // Use bulk handler if available (throttled, progress-tracked)
        if (onBulkImportSessions) {
          const result = await onBulkImportSessions(sessionsToImport, (current, total) => {
            setBulkProgress({ current, total });
          });
          imported = result.imported;
          failed = result.failed;
        } else {
          // Fallback: original single-insert loop
          await onImportSessions(sessionsToImport);
          imported = sessionsToImport.length;
        }
      }
    } catch (error) {
      console.error('Batch import failed:', error);
      failed = sessionsToImport.length;
    }

    setBulkProgress(null);
    setImportProgress({ imported, skipped, failed });
    setState('complete');

    // Only show toast if we used the fallback path (bulk handler shows its own toast)
    if (!onBulkImportSessions) {
      if (imported > 0) {
        let description = `${imported} session${imported !== 1 ? 's' : ''} imported`;
        if (skipped > 0) description += `, ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped`;
        if (failed > 0) description += `, ${failed} failed`;
        toast.success('Import complete', { description });
      } else if (skipped > 0) {
        toast.info('No new sessions', {
          description: `All ${skipped} session${skipped !== 1 ? 's' : ''} were already in your agenda`,
        });
      } else {
        toast.error('Import failed', { description: 'No sessions could be imported' });
      }
    }

    if (imported > 0 && onLineupUpdate) {
      const allSpeakers = sessionsToImport
        .flatMap(s => s.speakers || [])
        .filter((name, i, arr) => name && arr.indexOf(name) === i);
      if (allSpeakers.length > 0) onLineupUpdate(allSpeakers);
    }
  }, [parseResult, duplicateIndices, onImportSessions, onBulkImportSessions, onLineupUpdate]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Agenda Sessions
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* ── Idle State ── */}
          {state === 'idle' && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                  'hover:border-primary/50 hover:bg-primary/5',
                  'border-border bg-muted/30',
                  isDragActive && 'border-primary ring-2 ring-primary/30 bg-primary/10',
                )}
              >
                <input {...getInputProps()} />
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  {isDragActive
                    ? 'Drop your file here...'
                    : 'Drag and drop a file here, or click to browse'}
                </p>

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

                <Button variant="outline" className="min-h-[44px]" type="button">
                  Choose File
                </Button>

                {/* URL import - stop propagation so clicking doesn't open file picker */}
                <div
                  className="mt-4 pt-4 border-t border-border/50 w-full"
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => e.stopPropagation()}
                >
                  <p className="text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1.5">
                    <Link className="w-3.5 h-3.5" />
                    or import from a URL
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="Paste an agenda page URL"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      className="flex-1 text-sm rounded-lg min-h-[40px]"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && isValidUrl(urlInput.trim())) handleUrlImport();
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUrlImport}
                      disabled={!urlInput.trim() || !isValidUrl(urlInput.trim())}
                      className="min-h-[40px] shrink-0"
                    >
                      <Globe className="w-4 h-4 mr-1.5" />
                      Import
                    </Button>
                  </div>
                </div>
              </div>

              {/* Paste toggle */}
              <div className="flex items-center gap-3 px-1">
                <Switch
                  checked={showPasteInput}
                  onCheckedChange={setShowPasteInput}
                  id="agenda-paste-toggle"
                />
                <label
                  htmlFor="agenda-paste-toggle"
                  className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer"
                >
                  <Type className="w-4 h-4" />
                  Paste agenda text instead
                </label>
              </div>

              {showPasteInput && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Paste your agenda here — session listings, schedule text..."
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
                    Extract Sessions with AI
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
                    ? 'AI is extracting sessions from text...'
                    : ['pdf', 'image'].includes(parseResult?.sourceFormat ?? '')
                      ? 'AI is extracting sessions...'
                      : 'Parsing file...'}
              </p>
            </div>
          )}

          {/* ── Preview State ── */}
          {state === 'preview' && parseResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">
                    {parseResult.sessions.filter((_, i) => !duplicateIndices.has(i)).length} session
                    {parseResult.sessions.filter((_, i) => !duplicateIndices.has(i)).length !== 1
                      ? 's'
                      : ''}{' '}
                    to import
                  </p>
                  <div className="flex items-center flex-wrap gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      {getFormatLabel(parseResult.sourceFormat)}
                    </span>
                    {duplicateIndices.size > 0 && (
                      <span className="text-xs text-amber-500">
                        {duplicateIndices.size} duplicate{duplicateIndices.size !== 1 ? 's' : ''}{' '}
                        skipped
                      </span>
                    )}
                  </div>
                </div>
                <Calendar className="w-8 h-8 text-primary" />
              </div>

              {/* Session list */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {parseResult.sessions.map((session, i) => {
                  const isDuplicate = duplicateIndices.has(i);
                  return (
                    <Card key={i} className={cn('bg-muted/30', isDuplicate && 'opacity-50')}>
                      <CardContent className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{session.title}</p>
                            {isDuplicate && (
                              <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">
                                Duplicate
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {(session.session_date || session.start_time) && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {session.session_date && session.session_date}
                                {session.session_date && session.start_time && ' — '}
                                {session.start_time}
                                {session.end_time && ` - ${session.end_time}`}
                              </span>
                            )}
                            {session.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {session.location}
                              </span>
                            )}
                          </div>
                          {session.speakers && session.speakers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {session.speakers.map((sp, j) => (
                                <span
                                  key={j}
                                  className="inline-flex items-center gap-0.5 text-xs text-primary"
                                >
                                  <User className="w-3 h-3" />
                                  {sp}
                                </span>
                              ))}
                            </div>
                          )}
                          {session.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {session.description}
                            </p>
                          )}
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
              {bulkProgress ? (
                <div className="w-full max-w-xs space-y-2">
                  <p className="text-muted-foreground text-center">
                    Importing {bulkProgress.current} / {bulkProgress.total}...
                  </p>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${Math.round((bulkProgress.current / bulkProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Importing sessions...</p>
              )}
            </div>
          )}

          {/* ── Complete State ── */}
          {state === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2
                className={cn(
                  'w-16 h-16 mb-4',
                  importProgress.imported > 0 ? 'text-primary' : 'text-destructive',
                )}
              />
              <p className="font-medium text-lg mb-2">
                {importProgress.imported > 0 ? 'Import Complete!' : 'Import Failed'}
              </p>
              {importProgress.imported > 0 && (
                <p className="text-muted-foreground">
                  {importProgress.imported} session{importProgress.imported !== 1 ? 's' : ''} added
                  to your agenda
                </p>
              )}
              {importProgress.failed > 0 && (
                <p className="text-destructive text-sm mt-1">
                  {importProgress.failed} session{importProgress.failed !== 1 ? 's' : ''} failed
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          {state === 'preview' && parseResult && (
            <>
              <Button variant="outline" onClick={resetState} className="min-h-[44px]">
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  parseResult.sessions.filter((_, i) => !duplicateIndices.has(i)).length === 0
                }
                className="min-h-[44px]"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Import {parseResult.sessions.filter((_, i) => !duplicateIndices.has(i)).length}{' '}
                Session
                {parseResult.sessions.filter((_, i) => !duplicateIndices.has(i)).length !== 1
                  ? 's'
                  : ''}
              </Button>
            </>
          )}
          {state === 'complete' && (
            <Button onClick={handleClose} className="min-h-[44px]">
              Done
            </Button>
          )}
          {(state === 'idle' || state === 'parsing') && (
            <Button variant="outline" onClick={handleClose} className="min-h-[44px]">
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
