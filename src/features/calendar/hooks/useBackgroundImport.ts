/**
 * Background URL Import Hook
 *
 * Runs URL schedule imports in the background so the user can navigate
 * away. Shows persistent Sonner toast notifications at each stage and
 * stores the result for the CalendarImportModal to consume.
 */

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { parseURLSchedule, SmartParseResult } from '@/utils/calendarImportParsers';
import { useBackgroundImportStore } from '../stores/useBackgroundImportStore';
import { useNavigate } from 'react-router-dom';

export function useBackgroundImport(tripId?: string) {
  const navigate = useNavigate();

  const {
    isCalendarImporting: isImporting,
    calendarPendingResult: pendingResult,
    calendarSourceUrl: sourceUrl,
    calendarToastId: toastId,
    calendarAbortController: abortController,
    setCalendarImportState: setState,
    clearCalendarResult: clearResult,
  } = useBackgroundImportStore();

  const startImport = useCallback((url: string, onComplete?: () => void) => {
    if (useBackgroundImportStore.getState().isCalendarImporting) {
      toast.warning('An import is already in progress');
      return;
    }

    // Extract domain for display
    let domain = url;
    try {
      domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    } catch {
      // Use raw URL as fallback
    }

    const currentController = new AbortController();

    // Show persistent loading toast
    const newToastId = toast.loading(`Scanning ${domain} for schedule...`, {
      duration: Infinity,
      description: "You can navigate away — we'll notify you when it's done.",
    });

    setState({
      isCalendarImporting: true,
      calendarPendingResult: null,
      calendarSourceUrl: url,
      calendarToastId: newToastId,
      calendarAbortController: currentController,
    });

    // Run the import in the background (not awaited)
    parseURLSchedule(url)
      .then(result => {
        if (currentController.signal.aborted) return;

        setState({
          isCalendarImporting: false,
          calendarPendingResult: result,
          calendarSourceUrl: url,
        });

        toast.dismiss(newToastId);

        if (result.isValid && result.events.length > 0) {
          toast.success(
            `Found ${result.events.length} event${result.events.length !== 1 ? 's' : ''} from ${domain}`,
            {
              description: 'Open the import modal to review and add them to your calendar.',
              duration: Infinity,
              action: {
                label: 'View Events',
                onClick: () => {
                  // If we are given a tripId, we navigate to the trip page if not already there
                  if (tripId && !window.location.pathname.includes(`/trips/${tripId}`)) {
                    navigate(`/trips/${tripId}?tab=calendar&import=true`);
                  } else if (onComplete) {
                    onComplete();
                  }
                },
              },
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
        if (currentController.signal.aborted) return;

        setState({
          isCalendarImporting: false,
          calendarPendingResult: null,
          calendarSourceUrl: null,
        });

        toast.dismiss(newToastId);

        toast.error('Import failed', {
          description: err instanceof Error ? err.message : 'Unknown error occurred',
          duration: 8000,
        });
      });
  }, [setState, tripId, navigate]);

  const cancelImport = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }

    if (toastId) {
      toast.dismiss(toastId);
    }

    clearResult();

    toast.info('Import cancelled');
  }, [abortController, toastId, clearResult]);

  return {
    isBackgroundImporting: isImporting,
    pendingResult,
    sourceUrl,
    startImport,
    clearResult,
    cancelImport,
  };
}
