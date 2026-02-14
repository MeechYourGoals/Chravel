import React, { useCallback, useMemo, useState } from 'react';
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
import { Globe, Sparkles, Type, X, AlertTriangle, Users } from 'lucide-react';
import { parseLineupText, parseLineupURL } from '@/utils/lineupImportParsers';
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

export const LineupImportModal: React.FC<LineupImportModalProps> = ({
  isOpen,
  onClose,
  onImportNames,
}) => {
  const [state, setState] = useState<ImportState>('idle');
  const [urlInput, setUrlInput] = useState('');
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [sourceUrl, setSourceUrl] = useState<string | undefined>(undefined);
  const [parsedNames, setParsedNames] = useState<string[]>([]);
  const [mode, setMode] = useState<LineupImportMode>('merge');

  const resetState = useCallback(() => {
    setState('idle');
    setUrlInput('');
    setShowPasteInput(false);
    setPasteText('');
    setParsedNames([]);
    setSourceUrl(undefined);
    setMode('merge');
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const isValidUrl = useMemo(() => {
    if (!urlInput.trim()) return false;
    try {
      const url = new URL(urlInput.trim());
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }, [urlInput]);

  const handleUrlExtract = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) return;

    setState('parsing');
    const result = await parseLineupURL(url);
    if (!result.isValid || result.names.length === 0) {
      setState('idle');
      toast.error("Couldn't extract names from that link—try another URL or paste text");
      return;
    }

    setParsedNames(result.names);
    setSourceUrl(url);
    setState('preview');
  }, [urlInput]);

  const handleTextExtract = useCallback(async () => {
    const text = pasteText.trim();
    if (!text) return;

    setState('parsing');
    const result = await parseLineupText(text);
    if (!result.isValid || result.names.length === 0) {
      setState('idle');
      toast.error("Couldn't extract names from that link—try another URL or paste text");
      return;
    }

    setParsedNames(result.names);
    setSourceUrl(undefined);
    setState('preview');
  }, [pasteText]);

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
      toast.error("Couldn't extract names from that link—try another URL or paste text");
    }
  }, [parsedNames, onImportNames, mode, sourceUrl, handleClose]);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Smart Import Line-up
          </DialogTitle>
          <DialogDescription>Import names only from a lineup URL or pasted text.</DialogDescription>
        </DialogHeader>

        {state === 'idle' && (
          <div className="space-y-4">
            <Card className="bg-muted/30 border-border/60">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Import lineup names from an event website URL.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="Paste lineup page URL"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && isValidUrl) handleUrlExtract();
                    }}
                  />
                  <Button onClick={handleUrlExtract} disabled={!isValidUrl}>
                    <Globe className="w-4 h-4 mr-1.5" />
                    Extract
                  </Button>
                </div>
              </CardContent>
            </Card>

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
                  className="min-h-[120px]"
                />
                <Button onClick={handleTextExtract} disabled={!pasteText.trim()} className="w-full">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Extract Names with AI
                </Button>
              </div>
            )}
          </div>
        )}

        {state === 'parsing' && (
          <div className="py-12 text-center">
            <div className="mx-auto h-10 w-10 rounded-full border-b-2 border-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Extracting lineup names...</p>
          </div>
        )}

        {state === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/20">
              <div>
                <p className="font-medium">{parsedNames.length} names ready to import</p>
                <p className="text-xs text-muted-foreground">
                  Sorted and deduplicated (case-insensitive)
                </p>
              </div>
              <Users className="w-5 h-5 text-primary" />
            </div>

            <div className="max-h-[260px] overflow-y-auto border border-border rounded-lg p-3 space-y-2">
              {parsedNames.map(name => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-md border border-border/70 p-2 bg-background/40"
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

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
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
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={parsedNames.length === 0 || state === 'importing'}
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
      </DialogContent>
    </Dialog>
  );
};
