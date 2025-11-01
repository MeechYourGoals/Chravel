import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDemoMode } from '@/hooks/useDemoMode';

interface EmbeddingGenerationStatus {
  isGenerating: boolean;
  error: string | null;
  lastGenerated: Date | null;
}

export function useEmbeddingGeneration(tripId: string | undefined) {
  const [status, setStatus] = useState<EmbeddingGenerationStatus>({
    isGenerating: false,
    error: null,
    lastGenerated: null,
  });
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  const generateEmbeddings = useCallback(async (
    sourceType: 'chat' | 'task' | 'poll' | 'payment' | 'broadcast' | 'file' | 'link' | 'calendar' | 'all' = 'all',
    forceRefresh = false
  ) => {
    if (!tripId) {
      console.warn('No tripId provided for embedding generation');
      return false;
    }

    // Demo mode: Skip API calls, return success immediately
    if (isDemoMode) {
      console.log('[Demo Mode] Skipping embedding generation (using mock data)');
      setStatus({
        isGenerating: false,
        error: null,
        lastGenerated: new Date(),
      });
      return true;
    }

    setStatus(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      console.log(`Generating ${sourceType} embeddings for trip ${tripId}`);
      
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: {
          tripId,
          sourceType,
          forceRefresh,
          isDemoMode: false
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate embeddings');
      }

      console.log('Embedding generation completed:', data);
      
      setStatus({
        isGenerating: false,
        error: null,
        lastGenerated: new Date(),
      });

      // Only show toast if user initiated or if there were errors
      if (forceRefresh || data.totalProcessed === 0) {
        toast({
          title: 'AI Context Updated',
          description: `Generated ${data.totalProcessed} embeddings for better AI responses.`,
          duration: 3000,
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setStatus({
        isGenerating: false,
        error: errorMessage,
        lastGenerated: null,
      });

      // Only show error toast for user-initiated actions
      if (forceRefresh) {
        toast({
          title: 'Embedding Generation Failed',
          description: errorMessage,
          variant: 'destructive',
          duration: 5000,
        });
      }

      return false;
    }
  }, [tripId, toast, isDemoMode]);

  const generateInitialEmbeddings = useCallback(async () => {
    if (!tripId) return;

    // 🚀 OPTIMIZATION: Skip database operations in demo mode
    // RAG uses getMockRAGResults() in edge function, not database embeddings
    if (isDemoMode) {
      console.log('[Demo Mode] Skipping embeddings check (RAG uses mock data)');
      return;
    }

    try {
      const { data: existingEmbeddings, error } = await supabase
        .from('trip_embeddings')
        .select('id')
        .eq('trip_id', tripId)
        .limit(1);

      if (error) {
        console.error('Error checking existing embeddings:', error);
        return;
      }

      // Only generate if no embeddings exist
      if (!existingEmbeddings || existingEmbeddings.length === 0) {
        console.log('No embeddings found, generating initial embeddings...');
        await generateEmbeddings('all', false);
      } else {
        console.log('Embeddings already exist for trip:', tripId);
      }
    } catch (error) {
      console.error('Failed to check/generate initial embeddings:', error);
    }
  }, [tripId, generateEmbeddings, isDemoMode]);

  return {
    ...status,
    generateEmbeddings,
    generateInitialEmbeddings,
  };
}
