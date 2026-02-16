/**
 * Background URL Import Hook
 *
 * Runs URL schedule imports in the background so the user can navigate
 * away. Shows persistent Sonner toast notifications at each stage and
 * stores the result for the CalendarImportModal to consume.
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { parseURLSchedule, SmartParseResult } from '@/utils/calendarImportParsers';

interface BackgroundImportState {
  /** Whether a background import is currently running */
  isImporting: boolean;
  /** The completed result (null until finished) */
  pendingResult: SmartParseResult | null;
  /** The URL that was imported */
  sourceUrl: string | null;
}

export function useBackgroundImport() {
  const [state, setState] = useState<BackgroundImportState>({
    isImporting: false,
    pendingResult: null,
    sourceUrl: null,
  });

  // Track the active toast ID so we can update it
  const toastIdRef = useRef<string | number | null>(null);
  // AbortController for cancellation
  const abortRef = useRef<AbortController | null>(null);
  // Ref for duplicate-import guard (avoids stale closure on double-click)
  const importingRef = useRef(false);

  const startImport = useCallback((url: string, onComplete?: () => void) => {
    if (importingRef.current) {
      toast.warning('An import is already in progress');
      return;
    }
    importingRef.current = true;

    // Extract domain for display
    let domain = url;
    try {
      domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    } catch {
      // Use raw URL as fallback
    }

    // Clear any previous result
    setState({
      isImporting: true,
      pendingResult: null,
      sourceUrl: url,
    });

    // Create abort controller
    const abortController = new AbortController();
    abortRef.current = abortController;

    // Show persistent loading toast
    toastIdRef.current = toast.loading(`Scanning ${domain} for schedule...`, {
      duration: Infinity,
      description: "You can navigate away — we'll notify you when it's done.",
    });

    // Run the import in the background (not awaited)
    parseURLSchedule(url)
      .then(result => {
        if (abortController.signal.aborted) return;

        importingRef.current = false;
        setState({
          isImporting: false,
          pendingResult: result,
          sourceUrl: url,
        });

        if (toastIdRef.current) {
          toast.dismiss(toastIdRef.current);
        }

        if (result.isValid && result.events.length > 0) {
          toast.success(
            `Found ${result.events.length} event${result.events.length !== 1 ? 's' : ''} from ${domain}`,
            {
              description: 'Open the import modal to review and add them to your calendar.',
              duration: Infinity,
              action: onComplete
                ? {
                    label: 'View Events',
                    onClick: onComplete,
                  }
                : undefined,
            },
          );
        } else {
          const errorMsg = result.errors[0] || 'No schedule data found on this page';
          toast.error('Import failed', {
            description: errorMsg,
            duration: 8000,
          });
        }
      })
      .catch(err => {
        if (abortController.signal.aborted) return;

        importingRef.current = false;
        setState({
          isImporting: false,
          pendingResult: null,
          sourceUrl: null,
        });

        if (toastIdRef.current) {
          toast.dismiss(toastIdRef.current);
        }

        toast.error('Import failed', {
          description: err instanceof Error ? err.message : 'Unknown error occurred',
          duration: 8000,
        });
      });
  }, []);

  const clearResult = useCallback(() => {
    setState({
      isImporting: false,
      pendingResult: null,
      sourceUrl: null,
    });
  }, []);

  const cancelImport = useCallback(() => {
    importingRef.current = false;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }

    setState({
      isImporting: false,
      pendingResult: null,
      sourceUrl: null,
    });

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
