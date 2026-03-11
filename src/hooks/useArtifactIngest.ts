import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDemoMode } from '@/hooks/useDemoMode';
import type { ArtifactIngestResult, ArtifactSourceType, ArtifactType } from '@/types/artifacts';

interface IngestOptions {
  tripId: string;
  sourceType: ArtifactSourceType;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  base64Data?: string;
  artifactTypeOverride?: ArtifactType;
  metadata?: Record<string, unknown>;
}

interface IngestState {
  isIngesting: boolean;
  error: string | null;
  result: ArtifactIngestResult | null;
}

export function useArtifactIngest() {
  const [state, setState] = useState<IngestState>({
    isIngesting: false,
    error: null,
    result: null,
  });
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  const ingestArtifact = useCallback(
    async (options: IngestOptions): Promise<ArtifactIngestResult | null> => {
      if (!options.tripId) {
        console.warn('[useArtifactIngest] No tripId provided');
        return null;
      }

      if (isDemoMode) {
        setState({ isIngesting: false, error: null, result: null });
        return null;
      }

      setState({ isIngesting: true, error: null, result: null });

      try {
        const { data, error } = await supabase.functions.invoke('artifact-ingest', {
          body: {
            tripId: options.tripId,
            sourceType: options.sourceType,
            text: options.text,
            fileUrl: options.fileUrl,
            fileName: options.fileName,
            mimeType: options.mimeType,
            fileSizeBytes: options.fileSizeBytes,
            base64Data: options.base64Data,
            artifactTypeOverride: options.artifactTypeOverride,
            metadata: options.metadata,
          },
        });

        if (error) {
          throw error;
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Artifact ingestion failed');
        }

        const result: ArtifactIngestResult = {
          artifact: data.artifact,
          classification: data.classification,
          suggestedActions: data.suggestedActions || [],
          similarArtifacts: data.similarArtifacts || [],
          isDuplicate: data.isDuplicate || false,
        };

        setState({ isIngesting: false, error: null, result });

        if (result.isDuplicate) {
          toast({
            title: 'Possible Duplicate',
            description: 'A similar artifact already exists in this trip.',
            duration: 4000,
          });
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[useArtifactIngest] Failed:', errorMessage);
        setState({ isIngesting: false, error: errorMessage, result: null });

        toast({
          title: 'Import Failed',
          description: errorMessage,
          variant: 'destructive',
          duration: 5000,
        });

        return null;
      }
    },
    [toast, isDemoMode],
  );

  const reset = useCallback(() => {
    setState({ isIngesting: false, error: null, result: null });
  }, []);

  return {
    ...state,
    ingestArtifact,
    reset,
  };
}
