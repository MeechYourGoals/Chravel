/**
 * LineupImportModal
 *
 * Full parity with Calendar Import: drag-and-drop, file picker, URL, paste text.
 * Supports ICS, CSV, Excel, PDF, Image, URL.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Image,
  Calendar,
  Globe,
  Type,
  Sparkles,
  Link,
  X,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  parseLineupFile,
  parseLineupText,
  parseLineupURL,
  LineupParseResult,
} from '@/utils/lineupImportParsers';
import { toast } from 'sonner';

export type LineupImportMode = 'merge' | 'replace';

interface LineupImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportNames: (payload: {
    names: string[];
    mode: LineupImportMode;
    sourceUrl?: string;
  }) => Promise<number>;
}

type ImportState = 'idle' | 'parsing' | 'preview' | 'importing';

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

export const LineupImportModal: React.FC<LineupImportModalProps> = ({
  isOpen,
  onClose,
  onImportNames,
}) => {
  const [state, setState] = useState<ImportState>('idle');
  const [parseResult, setParseResult] = useState<LineupParseResult | null>(null);
  const [parsedNames, setParsedNames] = useState<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<LineupImportMode>('merge');
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [parsingSource, setParsingSource] = useState<'file' | 'text' | 'url'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setState('idle');
    setParseResult(null);
    setParsedNames([]);
    setSourceUrl(undefined);
    setMode('merge');
    setShowPasteInput(false);
    setPasteText('');
    setUrlInput('');
    setParsingSource('file');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const processParseResult = useCallback((result: LineupParseResult) => {
    setParseResult(result);
    if (!result.isValid || result.names.length === 0) {
      setState('idle');
      toast.error('No names found', {
        description: result.errors[0] || 'Could not extract any lineup names',
      });
      return;
    }
    setParsedNames(result.names);
    setState('preview');
  }, []);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setParsingSource('file');
      setState('parsing');
      const result = await parseLineupFile(file);
      processParseResult(result);
    },
    [processParseResult],
  );

  const handlePasteSubmit = useCallback(async () => {
    if (!pasteText.trim()) return;
    setParsingSource('text');
    setState('parsing');
    const result = await parseLineupText(pasteText.trim());
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
    setParsingSource('url');
    setState('parsing');
    const result = await parseLineupURL(trimmed);
    if (result.isValid && result.names.length > 0) {
      setSourceUrl(trimmed);
    } else {
      setSourceUrl(undefined);
    }
    processParseResult(result);
  }, [urlInput, processParseResult]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file && fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
        handleFileSelect({ target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>);
      }
    },
    [handleFileSelect],
  );

  const handleRemoveName = useCallback((name: string) => {
    setParsedNames(prev => prev.filter(current => current !== name));
  }, []);

  const handleImport = useCallback(async () => {
    if (parsedNames.length === 0) return;
    setState('importing');
    try {
      const imported = await onImportNames({ names: parsedNames, mode, sourceUrl });
      toast.success(`Imported ${imported} names to Line-up`);
      handleClose();
    } catch {
      setState('preview');
      toast.error('Import failed');
    }
  }, [parsedNames, onImportNames, mode, sourceUrl, handleClose]);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Smart Import Line-up
          </DialogTitle>
          <DialogDescription>
            Import performer, speaker, or artist names from a file, URL, or pasted text.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
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

                <div className="mt-4 pt-4 border-t border-border/50 w-full">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1.5">
                    <Link className="w-3.5 h-3.5" />
                    or import from a URL
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="Paste lineup page URL"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      className="flex-1 text-sm rounded-lg h-11"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && isValidUrl(urlInput.trim())) handleUrlImport();
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

              <div className="flex items-center gap-3 px-1">
                <Switch
                  checked={showPasteInput}
                  onCheckedChange={setShowPasteInput}
                  id="lineup-paste-toggle"
                />
                <label
                  htmlFor="lineup-paste-toggle"
                  className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer"
                >
                  <Type className="w-4 h-4" />
                  Paste text instead
                </label>
              </div>

              {showPasteInput && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Paste lineup text, artist lists, or performer names"
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
                    Extract Names with AI
                  </Button>
                </div>
              )}
            </div>
          )}

          {state === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground">
                {parsingSource === 'url'
                  ? 'Scanning website for lineup...'
                  : parsingSource === 'text'
                    ? 'AI is extracting names from text...'
                    : ['pdf', 'image'].includes(parseResult?.sourceFormat ?? '')
                      ? 'AI is extracting names...'
                      : 'Parsing file...'}
              </p>
            </div>
          )}

          {state === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">
                    {parsedNames.length} name{parsedNames.length !== 1 ? 's' : ''} ready to import
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sorted and deduplicated (case-insensitive)
                  </p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>

              <div className="max-h-[260px] overflow-y-auto space-y-2">
                {parsedNames.map(name => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-md border border-border/70 p-2 bg-muted/30"
                  >
                    <Badge variant="secondary" className="truncate max-w-[80%]">
                      {name}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveName(name)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2 text-amber-200">
                        <AlertTriangle className="w-4 h-4" />
                        Replace all mode
                      </p>
                      <p className="text-xs text-amber-200/80">
                        Clear existing line-up members before import.
                      </p>
                    </div>
                    <Switch
                      checked={mode === 'replace'}
                      onCheckedChange={checked => setMode(checked ? 'replace' : 'merge')}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={resetState} className="flex-1 min-h-[44px]">
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={parsedNames.length === 0 || state === 'importing'}
                  className="flex-1 min-h-[44px]"
                >
                  {state === 'importing'
                    ? 'Importing...'
                    : mode === 'replace'
                      ? 'Replace all'
                      : 'Merge names'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
