import React, { useState, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Upload,
  FileText,
  Image,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  X,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useArtifactIngest } from '@/hooks/useArtifactIngest';
import type { ArtifactIngestResult, ArtifactSuggestedAction } from '@/types/artifacts';
import type { ImportPhase } from '../types';
import { IMPORT_PHASE_LABELS, isFormatSupported, getFormatLabel } from '../types';

interface ArtifactImportDropzoneProps {
  tripId: string;
  onImportComplete?: (result: ArtifactIngestResult) => void;
  onClose?: () => void;
}

const ACCEPTED_TYPES: Record<string, string[]> = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const artifactTypeLabels: Record<string, string> = {
  flight: 'Flight',
  hotel: 'Hotel',
  restaurant_reservation: 'Restaurant',
  event_ticket: 'Event Ticket',
  itinerary: 'Itinerary',
  schedule: 'Schedule',
  place_recommendation: 'Place',
  payment_proof: 'Payment',
  roster: 'Roster',
  credential: 'Credential',
  generic_document: 'Document',
  generic_image: 'Image',
  unknown: 'Unknown',
};

const actionIcons: Record<string, React.ElementType> = {
  add_to_calendar: FileText,
  save_to_places: Sparkles,
  save_to_docs: FileText,
  attach_to_recap: Sparkles,
  store_in_memory: Sparkles,
};

/** Phase indicator for the artifact import pipeline */
const ArtifactPhaseIndicator: React.FC<{ phase: ImportPhase }> = ({ phase }) => {
  const steps: { key: ImportPhase; label: string }[] = [
    { key: 'parsing', label: 'Parsing' },
    { key: 'validating', label: 'Classifying' },
    { key: 'importing', label: 'Saving' },
  ];

  const currentIndex = steps.findIndex(s => s.key === phase);

  return (
    <div className="space-y-1.5" role="progressbar" aria-label="Artifact import progress">
      <p className="text-xs font-medium text-center text-muted-foreground">
        {IMPORT_PHASE_LABELS[phase]}
      </p>
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex-1">
            <div
              className={`h-1 rounded-full transition-colors ${
                currentIndex > idx
                  ? 'bg-green-500'
                  : currentIndex === idx
                    ? 'bg-primary animate-pulse'
                    : 'bg-muted'
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ArtifactImportDropzone: React.FC<ArtifactImportDropzoneProps> = ({
  tripId,
  onImportComplete,
  onClose,
}) => {
  const { isIngesting, ingestArtifact } = useArtifactIngest();
  const [result, setResult] = useState<ArtifactIngestResult | null>(null);
  const [textInput, setTextInput] = useState('');
  const [mode, setMode] = useState<'drop' | 'text'>('drop');
  const [importPhase, setImportPhase] = useState<ImportPhase>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [lastText, setLastText] = useState<string>('');

  const handleFileDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];

      // Validate file type and show feedback
      if (!isFormatSupported(file.name)) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'unknown';
        toast.error(`Unsupported file format: .${ext}`, {
          description: 'Supported formats: PDF, images (JPG, PNG, GIF, WebP), and text files.',
        });
        return;
      }

      const formatLabel = getFormatLabel(file.name);
      if (formatLabel) {
        toast.info(`Detected: ${formatLabel}`, { duration: 2000 });
      }

      setLastFile(file);
      setImportError(null);
      setImportPhase('parsing');

      // Read as base64 for inline upload
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const base64Match = dataUrl.match(/^data:[^;]+;base64,(.+)$/s);
        const base64Data = base64Match ? base64Match[1] : undefined;

        setImportPhase('validating');

        try {
          const ingestResult = await ingestArtifact({
            tripId,
            sourceType: 'upload',
            fileName: file.name,
            mimeType: file.type,
            fileSizeBytes: file.size,
            base64Data,
          });

          if (ingestResult) {
            setImportPhase('done');
            setResult(ingestResult);
            toast.success('Artifact imported successfully');
            onImportComplete?.(ingestResult);
          } else {
            setImportPhase('failed');
            setImportError('Import returned no result. Please try again.');
            toast.error('Import failed', { description: 'No result returned from the server.' });
          }
        } catch (err) {
          setImportPhase('failed');
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          setImportError(errorMsg);
          toast.error('Import failed', { description: errorMsg });
        }
      };
      reader.onerror = () => {
        setImportPhase('failed');
        setImportError('Failed to read file. Please try again.');
        toast.error('Failed to read file');
      };
      reader.readAsDataURL(file);
    },
    [tripId, ingestArtifact, onImportComplete],
  );

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return;

    setLastText(textInput.trim());
    setImportError(null);
    setImportPhase('parsing');

    try {
      setImportPhase('validating');
      const ingestResult = await ingestArtifact({
        tripId,
        sourceType: 'manual',
        text: textInput.trim(),
      });

      if (ingestResult) {
        setImportPhase('done');
        setResult(ingestResult);
        toast.success('Text imported successfully');
        onImportComplete?.(ingestResult);
      } else {
        setImportPhase('failed');
        setImportError('Import returned no result. Please try again.');
        toast.error('Import failed', { description: 'No result returned from the server.' });
      }
    } catch (err) {
      setImportPhase('failed');
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setImportError(errorMsg);
      toast.error('Import failed', { description: errorMsg });
    }
  }, [tripId, textInput, ingestArtifact, onImportComplete]);

  const handleRetry = useCallback(async () => {
    if (mode === 'drop' && lastFile) {
      await handleFileDrop([lastFile]);
    } else if (mode === 'text' && lastText) {
      setTextInput(lastText);
      await handleTextSubmit();
    }
  }, [mode, lastFile, lastText, handleFileDrop, handleTextSubmit]);

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    const first = rejections[0];
    if (!first) return;

    const errors = first.errors;
    if (errors.some(e => e.code === 'file-too-large')) {
      toast.error('File too large', {
        description: 'Maximum file size is 10MB. Please choose a smaller file.',
      });
    } else if (errors.some(e => e.code === 'file-invalid-type')) {
      const ext = first.file.name.split('.').pop()?.toLowerCase() ?? 'unknown';
      toast.error(`Unsupported format: .${ext}`, {
        description: 'Supported: PDF, images (JPG, PNG, GIF, WebP), and text files.',
      });
    } else {
      toast.error('Invalid file', {
        description: errors[0]?.message ?? 'Please use a supported file format.',
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    onDropRejected,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: isIngesting,
  });

  const handleReset = useCallback(() => {
    setResult(null);
    setTextInput('');
    setMode('drop');
    setImportPhase('idle');
    setImportError(null);
    setLastFile(null);
    setLastText('');
  }, []);

  // Result view — preview of imported item
  if (result) {
    const classification = result.classification;
    const typeLabel = artifactTypeLabels[classification.artifact_type] || 'Item';
    const confidence = Math.round(classification.confidence * 100);

    return (
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10 dark:border-green-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium text-sm">Imported Successfully</span>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close import result"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {typeLabel}
              </span>
              <span className="text-xs text-muted-foreground">{confidence}% confidence</span>
            </div>
            {result.artifact.ai_summary && (
              <p className="text-sm text-muted-foreground">{result.artifact.ai_summary}</p>
            )}
          </div>

          {result.isDuplicate && (
            <div className="flex items-center gap-2 text-amber-600 text-xs" role="alert">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>A similar artifact already exists in this trip</span>
            </div>
          )}

          {result.suggestedActions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Suggested Actions</p>
              <div className="flex flex-wrap gap-2">
                {result.suggestedActions.map((action: ArtifactSuggestedAction, idx: number) => {
                  const ActionIcon = actionIcons[action.type] || Sparkles;
                  return (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs h-11 min-h-[44px] gap-1"
                      aria-label={action.label}
                    >
                      <ActionIcon className="h-3 w-3" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="min-h-[44px]"
              aria-label="Import another artifact"
            >
              Import Another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state with phase indicator
  if (isIngesting) {
    return (
      <Card>
        <CardContent className="p-8 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-sm font-medium">Analyzing artifact...</p>
            <p className="text-xs text-muted-foreground">
              Extracting content, classifying, and generating embeddings
            </p>
          </div>
          <div className="w-full max-w-xs">
            <ArtifactPhaseIndicator phase={importPhase} />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state with retry
  if (importPhase === 'failed' && importError) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3" role="alert">
            <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Import failed</p>
              <p className="text-xs text-muted-foreground mt-0.5">{importError}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="min-h-[44px]"
              aria-label="Start over"
            >
              Start Over
            </Button>
            {(lastFile || lastText) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="min-h-[44px] gap-1"
                aria-label="Retry failed import"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant={mode === 'drop' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('drop')}
          className="text-xs min-h-[44px]"
          aria-label="Switch to file upload mode"
          aria-pressed={mode === 'drop'}
        >
          <Upload className="h-3 w-3 mr-1" />
          File
        </Button>
        <Button
          variant={mode === 'text' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('text')}
          className="text-xs min-h-[44px]"
          aria-label="Switch to text input mode"
          aria-pressed={mode === 'text'}
        >
          <FileText className="h-3 w-3 mr-1" />
          Text
        </Button>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close import dropzone"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {mode === 'drop' ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          role="button"
          aria-label="Drop a file or click to upload. Supported: screenshots, PDFs, images, or text files up to 10MB"
          tabIndex={0}
        >
          <input {...getInputProps()} aria-label="File selector for artifact import" />
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              {isDragActive ? (
                <Sparkles className="h-5 w-5 text-primary" />
              ) : (
                <Image className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {isDragActive ? 'Drop to import' : 'Drop a file or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Screenshots, PDFs, images, or text files (max 10MB)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="Paste a confirmation email, itinerary details, booking reference, or any trip-related text..."
            className="w-full h-32 p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
            aria-label="Paste trip-related text to import"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleTextSubmit}
              disabled={!textInput.trim()}
              className="gap-1 min-h-[44px]"
              aria-label="Analyze and import pasted text"
            >
              <Sparkles className="h-3 w-3" />
              Analyze & Import
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
