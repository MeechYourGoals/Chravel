/**
 * Background Agenda Import Hook
 *
 * Runs agenda URL imports in the background so the organizer can navigate
 * away. Shows persistent Sonner toast notifications and stores the result
 * for the AgendaImportModal to consume.
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { parseAgendaURL, AgendaParseResult } from '@/utils/agendaImportParsers';

interface BackgroundAgendaImportState {
  isImporting: boolean;
  pendingResult: AgendaParseResult | null;
  sourceUrl: string | null;
}

export function useBackgroundAgendaImport() {
  const [state, setState] = useState<BackgroundAgendaImportState>({
    isImporting: false,
    pendingResult: null,
    sourceUrl: null,
  });

  const toastIdRef = useRef<string | number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startImport = useCallback(
    (url: string, onComplete?: () => void) => {
      if (state.isImporting) {
        toast.warning('An import is already in progress');
        return;
      }

      let domain = url;
      try {
        domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      } catch {
        // Use raw URL as fallback
      }

      setState({ isImporting: true, pendingResult: null, sourceUrl: url });

      const abortController = new AbortController();
      abortRef.current = abortController;

      toastIdRef.current = toast.loading(`Scanning ${domain} for agenda sessions...`, {
        duration: Infinity,
        description: "You can navigate away — we'll notify you when it's done.",
      });

      parseAgendaURL(url)
        .then(result => {
          if (abortController.signal.aborted) return;

          setState({ isImporting: false, pendingResult: result, sourceUrl: url });

          if (toastIdRef.current) toast.dismiss(toastIdRef.current);

          if (result.isValid && result.sessions.length > 0) {
            toast.success(
              `Found ${result.sessions.length} session${result.sessions.length !== 1 ? 's' : ''} from ${domain}`,
              {
                description: 'Review and import them into your agenda.',
                duration: Infinity,
                action: onComplete ? { label: 'Review Sessions', onClick: onComplete } : undefined,
              },
            );
          } else {
            toast.error('Import failed', {
              description: result.errors[0] || 'No agenda sessions found on this page',
              duration: 8000,
            });
          }
        })
        .catch(err => {
          if (abortController.signal.aborted) return;

          setState({ isImporting: false, pendingResult: null, sourceUrl: null });

          if (toastIdRef.current) toast.dismiss(toastIdRef.current);

          toast.error('Import failed', {
            description: err instanceof Error ? err.message : 'Unknown error occurred',
            duration: 8000,
          });
        });
    },
    [state.isImporting],
  );

  const clearResult = useCallback(() => {
    setState({ isImporting: false, pendingResult: null, sourceUrl: null });
  }, []);

  const cancelImport = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
    setState({ isImporting: false, pendingResult: null, sourceUrl: null });
    toast.info('Import cancelled');
  }, []);

  return {
    isBackgroundImporting: state.isImporting,
    pendingResult: state.pendingResult,
    sourceUrl: state.sourceUrl,
    startImport,
    clearResult,
    cancelImport,
  };
}
