import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
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
} from 'lucide-react';
import { useArtifactIngest } from '@/hooks/useArtifactIngest';
import type { ArtifactIngestResult, ArtifactSuggestedAction } from '@/types/artifacts';

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

export const ArtifactImportDropzone: React.FC<ArtifactImportDropzoneProps> = ({
  tripId,
  onImportComplete,
  onClose,
}) => {
  const { isIngesting, ingestArtifact } = useArtifactIngest();
  const [result, setResult] = useState<ArtifactIngestResult | null>(null);
  const [textInput, setTextInput] = useState('');
  const [mode, setMode] = useState<'drop' | 'text'>('drop');

  const handleFileDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];

      // Read as base64 for inline upload
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const base64Match = dataUrl.match(/^data:[^;]+;base64,(.+)$/s);
        const base64Data = base64Match ? base64Match[1] : undefined;

        const ingestResult = await ingestArtifact({
          tripId,
          sourceType: 'upload',
          fileName: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size,
          base64Data,
        });

        if (ingestResult) {
          setResult(ingestResult);
          onImportComplete?.(ingestResult);
        }
      };
      reader.readAsDataURL(file);
    },
    [tripId, ingestArtifact, onImportComplete],
  );

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return;

    const ingestResult = await ingestArtifact({
      tripId,
      sourceType: 'manual',
      text: textInput.trim(),
    });

    if (ingestResult) {
      setResult(ingestResult);
      onImportComplete?.(ingestResult);
    }
  }, [tripId, textInput, ingestArtifact, onImportComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: isIngesting,
  });

  const handleReset = useCallback(() => {
    setResult(null);
    setTextInput('');
    setMode('drop');
  }, []);

  // Result view
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
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
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
            <div className="flex items-center gap-2 text-amber-600 text-xs">
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
                    <Button key={idx} variant="outline" size="sm" className="text-xs h-7 gap-1">
                      <ActionIcon className="h-3 w-3" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Import Another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
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
          className="text-xs"
        >
          <Upload className="h-3 w-3 mr-1" />
          File
        </Button>
        <Button
          variant={mode === 'text' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('text')}
          className="text-xs"
        >
          <FileText className="h-3 w-3 mr-1" />
          Text
        </Button>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground">
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
        >
          <input {...getInputProps()} />
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
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleTextSubmit}
              disabled={!textInput.trim()}
              className="gap-1"
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
