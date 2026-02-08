/**
 * AgendaImportModal
 *
 * Modal for importing agenda sessions from URL, PDF/Image, or pasted text.
 * Mirrors CalendarImportModal UX: drag-and-drop, URL input, text paste,
 * preview state, batch import.
 */

import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Upload, FileText, Calendar, MapPin, Clock, AlertTriangle,
  CheckCircle2, Image, Type, Sparkles, Globe, Link, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  parseAgendaFile,
  parseAgendaText,
  AgendaParseResult,
  ParsedAgendaSession,
} from '@/utils/agendaImportParsers';
import { toast } from 'sonner';

interface AgendaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onImportSessions: (sessions: ParsedAgendaSession[]) => Promise<void>;
  /** Pre-loaded result from background import */
  pendingResult?: AgendaParseResult | null;
  onClearPendingResult?: () => void;
  /** Background URL import handler */
  onStartBackgroundImport?: (url: string) => void;
  onLineupUpdate?: (speakerNames: string[]) => void;
}

type ImportState = 'idle' | 'parsing' | 'preview' | 'importing' | 'complete';

const ACCEPTED_FILE_TYPES = '.pdf,image/jpeg,image/png,image/webp,application/pdf';

const FORMAT_BADGES = [
  { label: 'PDF', icon: FileText },
  { label: 'Image', icon: Image },
  { label: 'URL', icon: Globe },
];

export const AgendaImportModal: React.FC<AgendaImportModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onImportSessions,
  pendingResult: externalPendingResult,
  onClearPendingResult,
  onStartBackgroundImport,
  onLineupUpdate,
}) => {
  const [state, setState] = useState<ImportState>('idle');
  const [parseResult, setParseResult] = useState<AgendaParseResult | null>(null);
  const [importProgress, setImportProgress] = useState({ imported: 0, failed: 0 });
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setState('idle');
    setParseResult(null);
    setImportProgress({ imported: 0, failed: 0 });
    setShowPasteInput(false);
    setPasteText('');
    setUrlInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClearPendingResult?.();
    onClose();
  }, [resetState, onClose, onClearPendingResult]);

  const processParseResult = useCallback((result: AgendaParseResult) => {
    setParseResult(result);
    if (!result.isValid || result.sessions.length === 0) {
      setState('idle');
      toast.error('No sessions found', {
        description: result.errors[0] || 'Could not extract any agenda sessions',
      });
      return;
    }
    setState('preview');
  }, []);

  // Load external pending result when modal opens
  React.useEffect(() => {
    if (isOpen && externalPendingResult?.isValid && externalPendingResult.sessions.length > 0) {
      processParseResult(externalPendingResult);
    }
  }, [isOpen, externalPendingResult, processParseResult]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setState('parsing');
    const result = await parseAgendaFile(file);
    processParseResult(result);
  }, [processParseResult]);

  const handlePasteSubmit = useCallback(async () => {
    if (!pasteText.trim()) return;
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

    // Fallback: synchronous
    setState('parsing');
    const { parseAgendaURL } = await import('@/utils/agendaImportParsers');
    const result = await parseAgendaURL(trimmed);
    processParseResult(result);
  }, [urlInput, processParseResult, onStartBackgroundImport, resetState, onClose]);

  const handleImport = useCallback(async () => {
    if (!parseResult) return;
    setState('importing');

    const sessions = parseResult.sessions;
    let imported = 0;
    let failed = 0;

    try {
      await onImportSessions(sessions);
      imported = sessions.length;
    } catch (error) {
      console.error('Batch import failed:', error);
      failed = sessions.length;
    }

    setImportProgress({ imported, failed });
    setState('complete');

    if (imported > 0) {
      toast.success('Import complete', {
        description: `${imported} session${imported !== 1 ? 's' : ''} imported`,
      });

      // Auto-populate lineup with speakers
      if (onLineupUpdate) {
        const allSpeakers = sessions
          .flatMap(s => s.speakers || [])
          .filter((name, i, arr) => name && arr.indexOf(name) === i);
        if (allSpeakers.length > 0) onLineupUpdate(allSpeakers);
      }
    } else {
      toast.error('Import failed', { description: 'No sessions could be imported' });
    }
  }, [parseResult, onImportSessions, onLineupUpdate]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      handleFileSelect({ target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [handleFileSelect]);

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

                <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                  {FORMAT_BADGES.map(({ label, icon: Icon }) => (
                    <span key={label} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                  ))}
                </div>

                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="min-h-[44px]">
                  Choose File
                </Button>
                <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleFileSelect} className="hidden" />

                {/* URL import */}
                <div className="mt-4 pt-4 border-t border-border/50 w-full">
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
                <Switch checked={showPasteInput} onCheckedChange={setShowPasteInput} id="agenda-paste-toggle" />
                <label htmlFor="agenda-paste-toggle" className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
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
                  <Button onClick={handlePasteSubmit} disabled={!pasteText.trim()} className="w-full min-h-[44px]">
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
              <p className="text-muted-foreground">AI is extracting agenda sessions...</p>
            </div>
          )}

          {/* ── Preview State ── */}
          {state === 'preview' && parseResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">
                    {parseResult.sessions.length} session{parseResult.sessions.length !== 1 ? 's' : ''} found
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                    {parseResult.sourceFormat === 'url' ? 'Website URL' : parseResult.sourceFormat === 'pdf' ? 'PDF Document' : parseResult.sourceFormat === 'image' ? 'Image' : 'Pasted Text'}
                  </span>
                </div>
                <Calendar className="w-8 h-8 text-primary" />
              </div>

              {/* Session list */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {parseResult.sessions.map((session, i) => (
                  <Card key={i} className="bg-muted/30">
                    <CardContent className="p-3">
                      <div className="space-y-1">
                        {session.track && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">{session.track}</span>
                        )}
                        <p className="font-medium text-sm">{session.title}</p>
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
                              <span key={j} className="inline-flex items-center gap-0.5 text-xs text-primary">
                                <User className="w-3 h-3" />{sp}
                              </span>
                            ))}
                          </div>
                        )}
                        {session.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{session.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── Importing State ── */}
          {state === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground">Importing sessions...</p>
            </div>
          )}

          {/* ── Complete State ── */}
          {state === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className={cn('w-16 h-16 mb-4', importProgress.imported > 0 ? 'text-primary' : 'text-destructive')} />
              <p className="font-medium text-lg mb-2">
                {importProgress.imported > 0 ? 'Import Complete!' : 'Import Failed'}
              </p>
              {importProgress.imported > 0 && (
                <p className="text-muted-foreground">
                  {importProgress.imported} session{importProgress.imported !== 1 ? 's' : ''} added to your agenda
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
              <Button onClick={handleImport} className="min-h-[44px]">
                <Sparkles className="w-4 h-4 mr-2" />
                Import {parseResult.sessions.length} Session{parseResult.sessions.length !== 1 ? 's' : ''}
              </Button>
            </>
          )}
          {state === 'complete' && (
            <Button onClick={handleClose} className="min-h-[44px]">Done</Button>
          )}
          {(state === 'idle' || state === 'parsing') && (
            <Button variant="outline" onClick={handleClose} className="min-h-[44px]">Cancel</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
